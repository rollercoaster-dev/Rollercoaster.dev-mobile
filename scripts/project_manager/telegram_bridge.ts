#!/usr/bin/env bun
/**
 * Durable, allowlisted Telegram transport for the local project manager.
 *
 * Delivery is at least once: Telegram cannot deduplicate a send after a lost HTTP
 * response. Local keys prevent deliberate duplicate notification enqueueing.
 */
import { Database } from "bun:sqlite";
import { dlopen } from "bun:ffi";
import { spawn, type ChildProcess } from "node:child_process";
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  statSync,
} from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { berlin } from "./pm";

export class BridgeError extends Error {}

/** A deliberate no: too long, quiet hours, weekend, muted, or a question already open. */
export class RefusedError extends BridgeError {}

export interface Config {
  token: string;
  chatId: number;
  userId: number;
}

export const MAX_LINES = 5;
export const MAX_CHARS = 700;
const MUTE_SECONDS = 30 * 60;
// Plain words, case and punctuation ignored: "OFF!" == off.
const CONTROLS: Record<string, string> = {
  status: "status",
  pause: "pause",
  off: "pause",
  resume: "resume",
  on: "resume",
  help: "help",
  stop: "stop",
  go: "go",
  skip: "skip",
  tasks: "tasks",
};
const HELP =
  "go / skip: today's plan\n" +
  "status, tasks: where things stand\n" +
  "stop: mute 30 min (work continues)\n" +
  "off / on: pause or resume work\n" +
  "Anything else: I answer in about a minute.";

const expand = (path: string) => resolve(path.replace(/^~(?=\/|$)/, homedir()));
const nowSeconds = () => Date.now() / 1000;

export function controlWord(text: string): string | null {
  const word = text.toLowerCase().replace(/[^a-z]/g, "");
  return text.length <= 20 ? (CONTROLS[word] ?? null) : null;
}

export function checkLength(text: string): void {
  if (text.trim().split(/\r?\n/).length > MAX_LINES || text.length > MAX_CHARS)
    throw new RefusedError(
      `Too long: max ${MAX_LINES} lines / ${MAX_CHARS} characters. Cut it down.`,
    );
}

/** One shell-style word: bare, 'single' or "double" quoted, optional trailing # comment. */
function singleWord(raw: string): string {
  const words: string[] = [];
  let current: string | null = null;
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (c === "'" || c === '"') {
      const end = raw.indexOf(c, i + 1);
      if (end < 0) throw new Error("unbalanced quote");
      let inner = raw.slice(i + 1, end);
      if (c === '"') inner = inner.replace(/\\(["\\])/g, "$1");
      current = (current ?? "") + inner;
      i = end;
    } else if (/\s/.test(c)) {
      if (current !== null) words.push(current);
      current = null;
    } else if (c === "#" && current === null) {
      break;
    } else if (c === "\\" && i + 1 < raw.length) {
      current = (current ?? "") + raw[++i];
    } else {
      current = (current ?? "") + c;
    }
  }
  if (current !== null) words.push(current);
  if (words.length !== 1) throw new Error("expected one value");
  return words[0];
}

export function loadConfig(path: string): Config {
  try {
    const values: Record<string, string> = {};
    for (let line of readFileSync(expand(path), "utf8").split(/\r?\n/)) {
      line = line.trim();
      if (!line || line.startsWith("#")) continue;
      const match = /^(?:export\s+)?([A-Z_]+)\s*=\s*(.*)$/.exec(line);
      if (!match) throw new Error();
      const [, key, raw] = match;
      if (raw.includes("$") || raw.includes("`")) throw new Error();
      values[key] = singleWord(raw);
    }
    const token = values.TELEGRAM_BOT_TOKEN;
    const integer = (v: string | undefined) => {
      if (v === undefined || !/^-?\d+$/.test(v.trim())) throw new Error();
      return Number(v.trim());
    };
    const chatId = integer(values.TELEGRAM_CHAT_ID);
    const userId = integer(values.TELEGRAM_USER_ID ?? String(chatId));
    if (
      !token ||
      /\s/.test(token) ||
      token.includes("/") ||
      chatId === 0 ||
      userId <= 0
    )
      throw new Error();
    return { token, chatId, userId };
  } catch {
    throw new BridgeError(
      "Invalid Telegram configuration; configure bot token, chat ID and a positive user ID (required for groups).",
    );
  }
}

// flock(2) via libc: exclusive, non-blocking, released automatically if the process dies.
const libc = dlopen(
  process.platform === "darwin" ? "/usr/lib/libSystem.B.dylib" : "libc.so.6",
  {
    flock: { args: ["i32", "i32"], returns: "i32" },
  },
);
const LOCK_EX = 2,
  LOCK_NB = 4,
  LOCK_UN = 8;

export async function withLock<T>(
  stateDir: string,
  fn: () => T | Promise<T>,
  filename = "telegram.receiver.lock",
): Promise<T> {
  mkdirSync(stateDir, { recursive: true, mode: 0o700 });
  const fd = openSync(join(stateDir, filename), "a", 0o600);
  try {
    if (libc.symbols.flock(fd, LOCK_EX | LOCK_NB) !== 0)
      throw new BridgeError("Telegram lock is already held.");
    try {
      return await fn();
    } finally {
      libc.symbols.flock(fd, LOCK_UN);
    }
  } finally {
    closeSync(fd);
  }
}

type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

export interface Http {
  call(method: string, payload: Record<string, unknown>): Promise<unknown>;
}

export class TelegramHTTP implements Http {
  constructor(
    private config: Config,
    private fetchImpl: FetchLike = fetch,
    private sleep: (ms: number) => Promise<void> = (ms) => Bun.sleep(ms),
  ) {}

  async call(
    method: string,
    payload: Record<string, unknown>,
  ): Promise<unknown> {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await this.fetchImpl(
          `https://api.telegram.org/bot${this.config.token}/${method}`,
          {
            method: "POST",
            body: JSON.stringify(payload),
            headers: { "Content-Type": "application/json" },
            signal: AbortSignal.timeout(35_000),
          },
        );
        const data = (await response.json()) as {
          ok?: boolean;
          result?: unknown;
        };
        if (
          !data ||
          typeof data !== "object" ||
          !data.ok ||
          !("result" in data)
        )
          throw new Error();
        return data.result;
      } catch {
        if (attempt < 2) await this.sleep(1000 * 2 ** attempt);
      }
    }
    // Never include the error: it may carry the token-bearing URL.
    throw new BridgeError(
      "Telegram request failed after three attempts; delivery remains queued.",
    );
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type Json = any;

/** At most five short lines: the picture, never a dump. */
export function formatStatus(data: Json): string {
  if (!("occupied" in data)) {
    const lines = Object.entries<Json>(data).map(
      ([key, value]) =>
        `${key.replace(/_/g, " ")}: ${typeof value === "object" && value !== null ? JSON.stringify(value) : value}`,
    );
    return lines.slice(0, MAX_LINES).join("\n");
  }
  const plan = data.plan;
  let today: string;
  if (data.pending_queue?.length) {
    today =
      "Queue: " +
      data.pending_queue
        .slice(0, 3)
        .map((n: number) => "#" + n)
        .join(", ");
  } else if (plan) {
    const labels: Record<string, string> = {
      approved: "go given",
      proposed: "waiting for your go",
      skipped: "skipped",
    };
    today = `Plan: ${plan.items.map((n: number) => "#" + n).join(" ")} (${labels[plan.status] ?? plan.status})`;
  } else if (data.last_plan && data.last_plan.status !== "skipped") {
    today = `Plan: none today. Last (${data.last_plan.date}): ${data.last_plan.items.map((n: number) => "#" + n).join(" ")}, go starts it`;
  } else {
    today = "Plan: none yet";
  }
  let state = data.paused ? "Off" : "On";
  if (data.weekend) state += ", weekend";
  const active = Object.entries<Json>(data.reservations || {})
    .filter(([, r]) => r.pr == null)
    .map(([key]) => key);
  const prs = (data.prs || []).filter(
    (p: Json) => String(p.state || "").toLowerCase() === "open",
  );
  const synced = data.synced_at;
  const age = synced
    ? `${Math.max(0, Math.floor((nowSeconds() - synced) / 60))} min ago`
    : "never";
  return [
    `${state}. ${today}`,
    "Working on: " +
      (active
        .slice(0, 3)
        .map((k) => "#" + k)
        .join(", ") || "nothing"),
    "Open PRs: " +
      (prs
        .slice(0, 3)
        .map((p: Json) => p.html_url || p.url || "#" + p.number)
        .join(" ") || "none"),
    `Open tasks: ${(data.open_tasks || []).length}`,
    `Slots ${data.occupied ?? 0}/${data.limit ?? 5} · audit ${(data.unaudited || []).length} remaining · synced ${age}`,
  ].join("\n");
}

// --- Pinned live status ------------------------------------------------

/** Berlin wall clock: weekday 0=Mon, minutes since midnight. */
function berlinClock(seconds: number): { weekday: number; minutes: number } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Berlin",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(seconds * 1000))
      .map((p) => [p.type, p.value]),
  );
  return {
    weekday: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(
      parts.weekday,
    ),
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

const hhmm = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

export const clockTime = (seconds: number) =>
  hhmm(berlinClock(seconds).minutes);

/** Next scheduled wakeup (install.ts timers): weekdays 09:00 to 18:00, every 30 min. */
export function nextRun(seconds: number): string {
  const { weekday, minutes } = berlinClock(seconds);
  if (weekday < 5 && minutes < 18 * 60) {
    const next = Math.max(9 * 60, (Math.floor(minutes / 30) + 1) * 30);
    return hhmm(next);
  }
  return weekday >= 4 ? "Mon 09:00" : "tomorrow 09:00";
}

export interface RunState {
  mode: string;
  started_at: number;
  pid?: number;
  ended_at?: number;
  exit?: number;
}

/**
 * The one message Joe looks at, built only from facts: heartbeat run state,
 * the current step, the open question, plan, PRs and tasks. Edited in place,
 * so it never notifies.
 */
export function pinText(input: {
  now: number;
  status: Json;
  run: RunState | null;
  running: boolean;
  step: { text: string; at: number } | null;
  ask: string | null;
}): string {
  const { now, status, run, running, step, ask } = input;
  const label = (mode: string) =>
    ({ plan: "Morning plan", recap: "Recap" })[mode] ?? "Work tick";
  let head: string;
  if (running && run) {
    const mins = Math.max(0, Math.floor((now - run.started_at) / 60));
    head = `🟢 ${label(run.mode)} running since ${clockTime(run.started_at)} (${mins} min).`;
  } else if (
    run &&
    run.exit !== undefined &&
    run.exit !== 0 &&
    run.ended_at !== undefined &&
    now - run.ended_at < 12 * 3600
  ) {
    head = `🔴 ${label(run.mode)} failed at ${clockTime(run.ended_at)}. Next run ${nextRun(now)}.`;
  } else if (run && !running && run.ended_at === undefined) {
    head = `🔴 ${label(run.mode)} from ${clockTime(run.started_at)} died. Next run ${nextRun(now)}.`;
  } else {
    head = `⚪ Idle. Next run ${nextRun(now)}.`;
  }
  if (status.paused) head = "⏸ Off: no new work until you say on.";
  const lines = [head];
  if (running && run && step && step.at >= run.started_at)
    lines.push(`NOW: ${step.text}`);
  if (ask) lines.push(`WAITING ON YOU: ${ask.split("\n")[0].slice(0, 80)}`);
  const plan = status.plan;
  if (plan?.items?.length) {
    const labels: Record<string, string> = {
      approved: "go given",
      proposed: "waiting for your go",
      skipped: "skipped",
    };
    lines.push(
      `Plan: ${plan.items.map((n: number) => "#" + n).join(" ")} (${labels[plan.status] ?? plan.status})`,
    );
  }
  const prs = (status.prs || []).filter(
    (p: Json) => String(p.state || "").toLowerCase() === "open",
  );
  if (prs.length)
    lines.push(
      `PRs (${prs.length}): ` +
        prs
          .slice(0, 4)
          .map((p: Json) => p.html_url || "#" + p.number)
          .join(" "),
    );
  const tasks = status.open_tasks || [];
  if (tasks.length)
    lines.push(
      `Tasks (${tasks.length}): ` +
        tasks
          .slice(0, 2)
          .map((t: Json) => `${t.id}. ${String(t.text).slice(0, 60)}`)
          .join(" · "),
    );
  return lines.join("\n");
}

function readJson(path: string): Json {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function alive(pid: number | undefined): boolean {
  if (!pid || !Number.isInteger(pid)) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === "EPERM";
  }
}

interface Listener {
  proc: ChildProcess;
  uid: number;
  exited: Promise<void>;
  done: boolean;
}

export class Bridge {
  readonly stateDir: string;
  readonly repoRoot: string;
  readonly db: Database;
  listener: Listener | null = null;

  constructor(
    stateDir: string,
    repoRoot: string,
    readonly config: Config,
    readonly http: Http = new TelegramHTTP(config),
    readonly now: () => number = nowSeconds,
  ) {
    this.stateDir = expand(stateDir);
    this.repoRoot = expand(repoRoot);
    mkdirSync(this.stateDir, { recursive: true, mode: 0o700 });
    this.db = new Database(join(this.stateDir, "telegram.sqlite3"), {
      create: true,
    });
    this.db.run("PRAGMA busy_timeout = 10000");
    this.db.run("PRAGMA journal_mode=WAL");
    this.db.run("PRAGMA synchronous=FULL");
    this.db.run(`
      CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      INSERT OR IGNORE INTO metadata VALUES ('offset', '0');
      CREATE TABLE IF NOT EXISTS inbox (
          update_id INTEGER PRIMARY KEY, text TEXT NOT NULL, message_id INTEGER NOT NULL,
          command TEXT, handled INTEGER NOT NULL DEFAULT 0, received_at REAL NOT NULL);
      CREATE TABLE IF NOT EXISTS outbox (
          id INTEGER PRIMARY KEY, dedup_key TEXT NOT NULL UNIQUE, text TEXT NOT NULL,
          update_id INTEGER, sent INTEGER NOT NULL DEFAULT 0, created_at REAL NOT NULL);
      CREATE TABLE IF NOT EXISTS listened (update_id INTEGER PRIMARY KEY, started_at REAL NOT NULL);
    `);
  }

  close(): void {
    this.db.close();
  }

  private tx<T>(fn: () => T): T {
    return this.db.transaction(fn)();
  }

  offset(): number {
    return Number(
      (
        this.db
          .query("SELECT value FROM metadata WHERE key='offset'")
          .get() as Json
      ).value,
    );
  }

  inbox(): Json[] {
    return this.db
      .query(
        "SELECT * FROM inbox WHERE handled=0 AND command IS NULL ORDER BY update_id",
      )
      .all();
  }

  private record(key: string, value: unknown): void {
    this.db.run("INSERT OR REPLACE INTO metadata (key,value) VALUES (?,?)", [
      key,
      String(value),
    ]);
  }

  private meta(key: string, fallback: string | null = null): string | null {
    const row = this.db
      .query("SELECT value FROM metadata WHERE key=?")
      .get(key) as Json;
    return row ? row.value : fallback;
  }

  /**
   * The recent conversation, oldest first: Joe's messages (with update id) and
   * delivered bot messages, merged by time. Lets the listener read "fixed" or
   * "ok" as an answer to whatever the bot said last.
   */
  history(limit = 12): string[] {
    const rows = this.db
      .query(
        "SELECT * FROM (" +
          "SELECT received_at AS at, 'Joe' AS who, update_id, text, 0 AS side FROM inbox " +
          "UNION ALL SELECT created_at AS at, 'Bot' AS who, NULL AS update_id, text, 1 AS side FROM outbox WHERE sent=1" +
          ") ORDER BY at DESC, side DESC LIMIT ?",
      )
      .all(Math.max(1, limit)) as Json[];
    return rows.reverse().map((row) => {
      const stamp = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/Berlin",
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).format(new Date(row.at * 1000));
      const who = row.who === "Joe" ? `Joe (update ${row.update_id})` : "Bot";
      return `[${stamp}] ${who}: ${String(row.text).replace(/\s*\n\s*/g, " / ")}`;
    });
  }

  health(): Json {
    const lastPoll = this.meta("last_poll");
    const count = (sql: string) => (this.db.query(sql).get() as Json).n;
    return {
      offset: this.offset(),
      last_poll: lastPoll ? Number(lastPoll) : null,
      last_error: this.meta("last_error") || null,
      unhandled_inbox: count("SELECT count(*) AS n FROM inbox WHERE handled=0"),
      pending_outbox: count("SELECT count(*) AS n FROM outbox WHERE sent=0"),
    };
  }

  private enqueue(
    text: string,
    key: string,
    updateId: number | null = null,
  ): void {
    if (typeof text !== "string" || !text.trim())
      throw new BridgeError("Message text must not be empty.");
    // Conservative size leaves room for astral Unicode characters (UTF-16).
    for (let index = 0, start = 0; start < text.length; index++, start += 1900)
      this.db.run(
        "INSERT OR IGNORE INTO outbox (dedup_key,text,update_id,created_at) VALUES (?,?,?,?)",
        [
          `${key}:${index}`,
          text.slice(start, start + 1900),
          updateId,
          nowSeconds(),
        ],
      );
  }

  /** A notification Joe didn't ask for. Refused when it would interrupt rest. */
  send(text: string, key: string | null = null, ask = false): void {
    checkLength(text);
    const now = berlin(this.now());
    if (now.weekday >= 5)
      throw new RefusedError("Weekend: no notifications. Hold it for Monday.");
    if (now.hour >= 21 || now.hour < 8)
      throw new RefusedError(
        "Quiet hours (21:00-08:00): hold it for the morning.",
      );
    if (Number(this.meta("muted_until", "0")) > this.now())
      throw new RefusedError("Joe muted the bot; send nothing.");
    if (ask && this.meta("open_ask_date") === now.date)
      throw new RefusedError(
        "A question is already open; wait for the answer.",
      );
    this.tx(() => {
      this.enqueue(text, "notification:" + (key ?? crypto.randomUUID()));
      if (ask) {
        this.db.run(
          "INSERT OR REPLACE INTO metadata VALUES ('open_ask_date', ?)",
          [now.date],
        );
        this.record("open_ask_text", text);
      }
    });
  }

  reply(updateId: number, text: string): void {
    checkLength(text);
    this.tx(() => {
      if (!this.db.query("SELECT 1 FROM inbox WHERE update_id=?").get(updateId))
        throw new BridgeError("Unknown inbox update ID.");
      this.enqueue(text, "reply:" + updateId, updateId);
    });
  }

  async flush(): Promise<void> {
    try {
      await withLock(
        this.stateDir,
        async () => {
          const rows = this.db
            .query("SELECT * FROM outbox WHERE sent=0 ORDER BY id LIMIT 100")
            .all() as Json[];
          for (const row of rows) {
            try {
              await this.http.call("sendMessage", {
                chat_id: this.config.chatId,
                text: row.text,
              });
            } catch (e) {
              if (!(e instanceof BridgeError)) throw e;
              this.record(
                "last_error",
                "Telegram delivery failed; response retained in outbox.",
              );
              break;
            }
            this.tx(() => {
              this.db.run("UPDATE outbox SET sent=1 WHERE id=?", [row.id]);
              if (row.update_id != null)
                this.db.run(
                  "UPDATE inbox SET handled=1 WHERE update_id=? AND NOT EXISTS (SELECT 1 FROM outbox WHERE update_id=? AND sent=0)",
                  [row.update_id, row.update_id],
                );
            });
          }
        },
        "telegram.delivery.lock",
      );
    } catch (e) {
      // Another local process is delivering the same durable queue.
      if (
        !(e instanceof BridgeError) ||
        e.message !== "Telegram lock is already held."
      )
        throw e;
    }
  }

  /** Text for the pinned status, from local state only (no GitHub calls). */
  pinStatus(): string {
    const result = this.pm("status");
    if (result.exitCode !== 0) throw new BridgeError("pm status failed");
    const status = JSON.parse(result.stdout);
    const run = readJson(join(this.stateDir, "run.json")) as RunState | null;
    const today = berlin(this.now()).date;
    return pinText({
      now: this.now(),
      status,
      run,
      running: !!run && run.ended_at === undefined && alive(run.pid),
      step: readJson(join(this.stateDir, "now.json")),
      ask:
        this.meta("open_ask_date") === today
          ? this.meta("open_ask_text")
          : null,
    });
  }

  /**
   * Keep one pinned message current: edit it when the text changed (silent),
   * or send a silent message and pin it when there is none yet.
   */
  async pin(text: string = this.pinStatus()): Promise<boolean> {
    if (text === this.meta("pin_text")) return false;
    const id = Number(this.meta("pin_id", "0"));
    if (id) {
      try {
        await this.http.call("editMessageText", {
          chat_id: this.config.chatId,
          message_id: id,
          text,
          link_preview_options: { is_disabled: true },
        });
        this.record("pin_text", text);
        return true;
      } catch (e) {
        if (!(e instanceof BridgeError)) throw e;
        // Gone or not editable: fall through and pin a fresh one.
      }
    }
    const sent = (await this.http.call("sendMessage", {
      chat_id: this.config.chatId,
      text,
      disable_notification: true,
      link_preview_options: { is_disabled: true },
    })) as Json;
    this.tx(() => {
      this.record("pin_id", sent.message_id);
      this.record("pin_text", text);
    });
    await this.http
      .call("pinChatMessage", {
        chat_id: this.config.chatId,
        message_id: sent.message_id,
        disable_notification: true,
      })
      .catch(() => this.record("last_error", "Could not pin the status."));
    return true;
  }

  private authorized(message: Json): boolean {
    const sender = message.from || {};
    return (
      (message.chat || {}).id === this.config.chatId &&
      sender.id === this.config.userId &&
      sender.is_bot === false &&
      !message.sender_chat &&
      !Object.keys(message).some((key) => key.startsWith("forward_")) &&
      typeof message.text === "string"
    );
  }

  private pm(...args: string[]): { exitCode: number | null; stdout: string } {
    const result = Bun.spawnSync(
      [
        process.execPath,
        join(this.repoRoot, "scripts/project_manager/pm.ts"),
        "--state-dir",
        this.stateDir,
        ...args,
      ],
      { stdout: "pipe", stderr: "pipe", timeout: 60_000 },
    );
    return { exitCode: result.exitCode, stdout: result.stdout.toString() };
  }

  private answer(row: Json): string {
    const command: string = row.command;
    if (command === "help") return HELP;
    if (command === "stop") {
      this.record("muted_until", this.now() + MUTE_SECONDS);
      this.stopListener();
      return "Muted for 30 min. Work continues. Any message unmutes.";
    }
    const args =
      command === "go"
        ? [
            "plan-approve",
            "--approval-ref",
            `Telegram update ${row.update_id}: go`,
          ]
        : command === "skip"
          ? ["plan-skip"]
          : [command];
    const result = this.pm(...args);
    const data = JSON.parse(result.stdout);
    if (result.exitCode !== 0) {
      if (data && typeof data === "object" && data.error)
        return data.error + "."; // A gate said no: answer it, don't retry.
      throw new Error("project manager command failed");
    }
    switch (command) {
      case "status":
        return formatStatus(data);
      case "pause":
        return "Off. No new work until you say on.";
      case "resume":
        return "On.";
      case "go":
        return `Go: ${(data.items || []).map((n: number) => "#" + n).join(", ")}. Starts at the next work tick (within 30 min).`;
      case "skip":
        return "Skipped today. Nothing starts.";
      case "tasks":
        if (!data.length) return "No open tasks.";
        return data
          .slice(0, MAX_LINES)
          .map((t: Json) => `${t.id}. ${String(t.text).slice(0, 80)}`)
          .join("\n");
      default:
        return formatStatus(data);
    }
  }

  private commands(): void {
    const rows = this.db
      .query(
        "SELECT * FROM inbox WHERE handled=0 AND command IS NOT NULL ORDER BY update_id",
      )
      .all() as Json[];
    for (const row of rows) {
      if (
        this.db
          .query("SELECT 1 FROM outbox WHERE update_id=?")
          .get(row.update_id)
      )
        continue;
      let answer: string;
      try {
        answer = this.answer(row);
      } catch {
        this.record(
          "last_error",
          "Project manager command failed; saved for retry.",
        );
        // Keep the command unhandled and retry on the next poll.
        this.tx(() =>
          this.enqueue(
            "That command could not run. Saved; retrying.",
            "command-error:" + row.update_id,
          ),
        );
        // Preserve user intent ordering: do not let a later pause or
        // resume execute before this older command can be retried.
        break;
      }
      this.reply(row.update_id, answer);
    }
  }

  // --- Listener: an instant, read-only answer to free text ---

  private stopListener(): void {
    if (this.listener && !this.listener.done)
      this.listener.proc.kill("SIGTERM");
  }

  private listen(): void {
    if (this.listener) {
      if (!this.listener.done) return;
      const { uid } = this.listener;
      this.listener = null;
      if (!this.db.query("SELECT 1 FROM outbox WHERE update_id=?").get(uid))
        // Honest fallback; the message stays in the inbox for the next tick.
        this.tx(() =>
          this.enqueue(
            "Couldn't answer that one right now. Saved for the next work tick.",
            "listen-fail:" + uid,
          ),
        );
    }
    const row = this.db
      .query(
        "SELECT update_id FROM inbox WHERE handled=0 AND command IS NULL AND update_id NOT IN " +
          "(SELECT update_id FROM listened) ORDER BY update_id LIMIT 1",
      )
      .get() as Json;
    if (!row) return;
    const uid: number = row.update_id;
    this.db.run("INSERT INTO listened VALUES (?, ?)", [uid, this.now()]);
    const script = join(this.repoRoot, "scripts/project_manager/listen.sh");
    if (!existsSync(script) || !statSync(script).isFile()) {
      this.tx(() =>
        this.enqueue(
          "Saved. No instant answer available; the next work tick picks it up.",
          "ack:" + uid,
        ),
      );
      return;
    }
    const log = openSync(join(this.stateDir, "listen.log"), "a", 0o600);
    try {
      const proc = spawn(script, [String(uid)], {
        stdio: ["ignore", log, log],
        detached: true,
      });
      const listener: Listener = {
        proc,
        uid,
        done: false,
        exited: Promise.resolve(),
      };
      listener.exited = new Promise((done) => {
        const finish = () => {
          listener.done = true;
          done();
        };
        proc.once("exit", finish);
        proc.once("error", finish);
      });
      this.listener = listener;
    } finally {
      closeSync(log);
    }
  }

  async once(timeout = 0): Promise<void> {
    this.record("last_error", "");
    this.commands();
    await this.flush();
    let updates: Json[];
    try {
      updates = (await this.http.call("getUpdates", {
        offset: this.offset(),
        timeout,
        limit: 100,
        allowed_updates: ["message"],
      })) as Json[];
    } catch (e) {
      this.record("last_error", "Telegram polling failed.");
      throw e;
    }
    this.record("last_poll", nowSeconds());
    for (const update of updates) {
      const uid = update.update_id;
      if (!Number.isInteger(uid) || uid < this.offset()) continue;
      const message = update.message || {};
      this.tx(() => {
        if (this.authorized(message)) {
          const text: string = message.text;
          const command = controlWord(text);
          const inserted = this.db.run(
            "INSERT OR IGNORE INTO inbox (update_id,text,message_id,command,received_at) VALUES (?,?,?,?,?)",
            [uid, text, message.message_id, command, nowSeconds()],
          ).changes;
          if (inserted) {
            // Any message from Joe answers the open question; anything but stop unmutes.
            this.db.run(
              "DELETE FROM metadata WHERE key IN ('open_ask_date','open_ask_text')",
            );
            if (command !== "stop")
              this.db.run("DELETE FROM metadata WHERE key='muted_until'");
          }
        }
        this.db.run("UPDATE metadata SET value=? WHERE key='offset'", [
          String(uid + 1),
        ]);
      });
    }
    this.commands();
    this.listen();
    await this.flush();
  }
}

// --- CLI ---------------------------------------------------------------

const USAGE = `usage: telegram_bridge.ts [--state-dir DIR] [--repo-root DIR] [--env-file FILE] COMMAND
commands: run | once | inbox | health | history [--limit N] | pin [--print] | send TEXT [--key K] [--ask] | reply UPDATE_ID TEXT`;

export async function main(
  argv: string[] = process.argv.slice(2),
): Promise<number> {
  const options: Record<string, string> = {
    "state-dir": "~/.local/state/rollercoaster-pm",
    "repo-root": resolve(import.meta.dir, "../.."),
    "env-file": "~/.config/telegram/env",
  };
  const positional: string[] = [];
  let ask = false;
  let print = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--ask") ask = true;
    else if (arg === "--print") print = true;
    else if (
      ["--state-dir", "--repo-root", "--env-file", "--key", "--limit"].includes(
        arg,
      ) &&
      argv[i + 1] !== undefined
    )
      options[arg.slice(2)] = argv[++i];
    else if (arg.startsWith("--")) {
      console.error(`${USAGE}\nerror: unknown option ${arg}`);
      return 2;
    } else positional.push(arg);
  }
  const [command, ...rest] = positional;
  const valid =
    (["run", "once", "inbox", "health", "history", "pin"].includes(command) &&
      rest.length === 0) ||
    (command === "send" && rest.length === 1) ||
    (command === "reply" && rest.length === 2 && /^-?\d+$/.test(rest[0]));
  if (!valid) {
    console.error(USAGE);
    return 2;
  }
  process.umask(0o077);
  let bridge: Bridge | null = null;
  try {
    bridge = new Bridge(
      options["state-dir"],
      options["repo-root"],
      loadConfig(options["env-file"]),
    );
    const b = bridge;
    if (command === "run" || command === "once") {
      await withLock(b.stateDir, async () => {
        if (command === "once") return b.once();
        let pinnedAt = 0;
        for (;;) {
          try {
            await b.once(25);
          } catch {
            console.error(
              "Telegram polling failed; retrying with durable state retained.",
            );
            await Bun.sleep(5000);
          }
          // The pinned status, refreshed at most every 30 s; never blocks polling.
          if (Date.now() - pinnedAt >= 30_000) {
            pinnedAt = Date.now();
            await b.pin().catch(() => {
              console.error("Pinned status update failed; retrying later.");
            });
          }
        }
      });
    } else if (command === "inbox") {
      console.log(JSON.stringify(b.inbox()));
    } else if (command === "history") {
      const limit = /^\d+$/.test(options.limit ?? "")
        ? Number(options.limit)
        : 12;
      console.log(b.history(limit).join("\n"));
    } else if (command === "pin") {
      if (print) console.log(b.pinStatus());
      else console.log(JSON.stringify({ updated: await b.pin() }));
    } else if (command === "health") {
      console.log(JSON.stringify(b.health()));
    } else {
      if (command === "send") b.send(rest[0], options.key ?? null, ask);
      else b.reply(Number(rest[0]), rest[1]);
      await b.flush();
      console.log(JSON.stringify(b.health()));
    }
    return 0;
  } catch (e) {
    if (e instanceof RefusedError) {
      console.log(JSON.stringify({ refused: e.message }));
      return 3;
    }
    console.error(
      "Telegram bridge failed; check configuration, state permissions, and receiver lock.",
    );
    return 1;
  } finally {
    bridge?.close();
  }
}

if (import.meta.main) process.exit(await main());
