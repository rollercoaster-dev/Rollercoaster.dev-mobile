#!/usr/bin/env bun
/** Persistent admission control for the Rollercoaster issue queue. Never merges. */
import { Database } from "bun:sqlite";
import { chmodSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

export const REPO = "rollercoaster-dev/Rollercoaster.dev-mobile";
export const DEFAULT_STATE = join(homedir(), ".local/state/rollercoaster-pm");
export const PLAN_CAP = 3;
const BLOCKING_LABELS = new Set([
  "hitl",
  "needs:design",
  "dep:blocked",
  "type:epic",
]);
const VERDICTS = [
  "needed",
  "implemented",
  "superseded",
  "duplicate",
  "blocked",
  "decision",
];
const CLOSING_VERDICTS = new Set([
  "implemented",
  "superseded",
  "duplicate",
  "blocked",
  "decision",
]);

export class GateError extends Error {}

// Loose shapes: GitHub payloads and persisted state are JSON from outside this file.
/* eslint-disable @typescript-eslint/no-explicit-any */
type Json = any;
export type Fetch = () => Json;

export function excluded(pr: Json): boolean {
  const author = pr.user.login;
  return (
    author === "dependabot[bot]" ||
    (author === "github-actions[bot]" &&
      pr.head.ref.startsWith("release-please--branches--"))
  );
}

export function linkedIssues(pr: Json): Set<number> {
  const body: string = pr.body || "";
  const numbers: number[] = [];
  const patterns = [
    /(?:closes?|fix(?:es)?|resolves?|refs?|related\s+to)\s+#(\d+)\b/gi,
    /https:\/\/github\.com\/rollercoaster-dev\/Rollercoaster\.dev-mobile\/issues\/(\d+)\b/gi,
    /rollercoaster-dev\/Rollercoaster\.dev-mobile#(\d+)\b/gi,
  ];
  for (const pattern of patterns)
    for (const m of body.matchAll(pattern)) numbers.push(Number(m[1]));
  return new Set(numbers);
}

/** Berlin calendar date (YYYY-MM-DD) and weekday (0 = Monday) for a Unix timestamp in seconds. */
/** What status shows of a PR: enough to name and link it, never the API dump. */
function prSummary(pr: Json): Json {
  return {
    number: pr.number,
    title: pr.title,
    html_url: pr.html_url,
    state: pr.state,
    draft: pr.draft,
    merged_at: pr.merged_at,
    branch: (pr.head || {}).ref,
    issues: [...linkedIssues(pr)],
  };
}

export function berlin(seconds: number): {
  date: string;
  weekday: number;
  hour: number;
} {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Berlin",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
      weekday: "short",
    })
      .formatToParts(new Date(seconds * 1000))
      .map((p) => [p.type, p.value]),
  );
  const weekday = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(
    parts.weekday,
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    weekday,
    hour: Number(parts.hour),
  };
}

const nowSeconds = () => Date.now() / 1000;

export class Manager {
  readonly directory: string;
  readonly db: string;
  readonly now: () => number;

  constructor(
    directory: string = DEFAULT_STATE,
    now: () => number = nowSeconds,
  ) {
    this.now = now;
    this.directory = resolve(directory.replace(/^~(?=\/|$)/, homedir()));
    mkdirSync(this.directory, { recursive: true, mode: 0o700 });
    this.db = join(this.directory, "manager.sqlite3");
    const conn = this.open();
    try {
      conn.run(
        "CREATE TABLE IF NOT EXISTS state (id INTEGER PRIMARY KEY, data TEXT NOT NULL)",
      );
      conn.run("INSERT OR IGNORE INTO state VALUES (1, ?)", [
        JSON.stringify({
          paused: false,
          approved: null,
          queue: [],
          audits: {},
          reservations: {},
          prs: {},
          snapshot: null,
          synced_at: null,
        }),
      ]);
    } finally {
      conn.close();
    }
    chmodSync(this.db, 0o600);
  }

  private open(): Database {
    const conn = new Database(this.db, { create: true });
    conn.run("PRAGMA busy_timeout = 120000");
    return conn;
  }

  /** Read-modify-write the single JSON state row under an IMMEDIATE (write) lock. */
  transaction<T>(fn: (s: Json) => T): T {
    const conn = this.open();
    try {
      conn.run("BEGIN IMMEDIATE");
      try {
        const row = conn.query("SELECT data FROM state WHERE id=1").get() as {
          data: string;
        };
        const state = JSON.parse(row.data);
        state.plan ??= null;
        state.tasks ??= [];
        const result = fn(state);
        conn.run("UPDATE state SET data=? WHERE id=1", [JSON.stringify(state)]);
        conn.run("COMMIT");
        return result;
      } catch (error) {
        conn.run("ROLLBACK");
        throw error;
      }
    } finally {
      conn.close();
    }
  }

  readSaved(): Json {
    const conn = this.open();
    try {
      return JSON.parse(
        (
          conn.query("SELECT data FROM state WHERE id=1").get() as {
            data: string;
          }
        ).data,
      );
    } finally {
      conn.close();
    }
  }

  private syncInto(s: Json, data: Json): void {
    if (
      !data?.head ||
      !Array.isArray(data.prs) ||
      !Array.isArray(data.issues) ||
      !Array.isArray(data.board)
    )
      throw new GateError("Incomplete GitHub snapshot; dispatch stopped");
    const incoming: Record<string, Json> = {};
    for (const p of data.prs) incoming[String(p.number)] = p;
    // Previously observed PRs must never vanish because of a partial read.
    if (Object.keys(s.prs).some((key) => !(key in incoming)))
      throw new GateError("Snapshot omitted tracked PRs; dispatch stopped");
    for (const [key, p] of Object.entries(incoming))
      if (!excluded(p) && (p.state === "open" || key in s.prs)) s.prs[key] = p;
    for (const reservation of Object.values<Json>(s.reservations)) {
      // Recover a create-PR/bind crash via the uniquely named issue branch.
      if (reservation.pr == null) {
        const matches = Object.values<Json>(s.prs).filter(
          (p) =>
            p.head.ref === reservation.branch &&
            (p.head.repo || {}).full_name === REPO &&
            !(reservation.seen_prs || []).includes(p.number),
        );
        if (matches.length === 1) reservation.pr = matches[0].number;
      }
    }
    s.snapshot = data;
    s.synced_at = nowSeconds();
  }

  sync(data: Json): Json {
    this.transaction((s) => this.syncInto(s, data));
    return this.status();
  }

  private occupied(s: Json): number {
    // A close without merge is deliberately retained until manually resolved.
    const prs = Object.values<Json>(s.prs).filter(
      (p) =>
        !(
          p.merged_at &&
          (p.merged_by || {}).login === "joeczar" &&
          (p.merged_by || {}).type === "User"
        ),
    ).length;
    const reservations = Object.values<Json>(s.reservations).filter(
      (r) => r.pr == null,
    ).length;
    return prs + reservations;
  }

  private unaudited(s: Json): number[] {
    return ((s.snapshot || {}).issues || [])
      .filter(
        (i: Json) =>
          (s.audits[String(i.number)] || {}).issue_updated_at !== i.updated_at,
      )
      .map((i: Json) => i.number);
  }

  private covered(s: Json): Set<string> {
    const covered = new Set<string>(Object.keys(s.reservations));
    for (const p of Object.values<Json>(s.prs))
      for (const n of linkedIssues(p)) covered.add(String(n));
    return covered;
  }

  /** The board's Next column, by priority, execution order and board position; first unaudited-or-needed candidate. */
  private nextAutoIssue(s: Json): number | null {
    const issues = new Map<number, Json>(
      s.snapshot.issues.map((i: Json) => [i.number, i]),
    );
    const covered = this.covered(s);
    const priority: Record<string, number> = { High: 0, Medium: 1, Low: 2 };
    const candidates = s.snapshot.board
      .map((item: Json, index: number) => ({ item, index }))
      .sort((a: Json, b: Json) => {
        const pa = priority[a.item.priority] ?? 3,
          pb = priority[b.item.priority] ?? 3;
        if (pa !== pb) return pa - pb;
        const oa = a.item.order ?? Infinity,
          ob = b.item.order ?? Infinity;
        if (oa !== ob) return oa < ob ? -1 : 1;
        return a.index - b.index;
      });
    for (const { item } of candidates) {
      const n = item.number;
      const issue = issues.get(n);
      if (item.status !== "Next" || !issue || covered.has(String(n))) continue;
      if ((issue.labels || []).some((l: Json) => BLOCKING_LABELS.has(l.name)))
        continue;
      const audit = s.audits[String(n)] || {};
      if (
        audit.head === s.snapshot.head &&
        audit.issue_updated_at === issue.updated_at &&
        CLOSING_VERDICTS.has(audit.verdict)
      )
        continue;
      return n;
    }
    return null;
  }

  status(): Json {
    return this.transaction((s) => {
      const covered = this.covered(s);
      return {
        pending_queue: s.queue.filter((n: number) => !covered.has(String(n))),
        paused: s.paused,
        mode: s.approved
          ? "manual-queue"
          : s.queue.length === 0
            ? "auto-dispatch"
            : "awaiting-queue-approval",
        queue_approved: Boolean(s.approved),
        occupied: this.occupied(s),
        limit: 5,
        next_auto_issue:
          s.snapshot && s.queue.length === 0 ? this.nextAutoIssue(s) : null,
        prs: Object.values<Json>(s.prs).map(prSummary),
        reservations: s.reservations,
        queue: s.queue,
        audits: s.audits,
        unaudited: this.unaudited(s),
        issue_count: ((s.snapshot || {}).issues || []).length,
        synced_at: s.synced_at,
        today: this.today(),
        plan: this.todayPlan(s),
        // An older plan is not today's: it starts nothing until a new go.
        last_plan:
          s.plan && !this.todayPlan(s)
            ? { date: s.plan.date, items: s.plan.items, status: s.plan.status }
            : null,
        weekend: this.weekend(),
        open_tasks: s.tasks.filter((t: Json) => t.status === "open"),
      };
    });
  }

  snapshot(): Json {
    return this.transaction((s) => s.snapshot);
  }

  pause(): Json {
    this.transaction((s) => (s.paused = true));
    return this.status();
  }

  resume(): Json {
    this.transaction((s) => (s.paused = false));
    return this.status();
  }

  // --- Daily plan (Joe approves with "go"; nothing starts without it) ---

  private today(): string {
    return berlin(this.now()).date;
  }

  private weekend(): boolean {
    return berlin(this.now()).weekday >= 5;
  }

  private todayPlan(s: Json): Json {
    const plan = s.plan;
    return plan && plan.date === this.today() ? plan : null;
  }

  planPropose(issues: number[]): Json {
    if (this.weekend()) throw new GateError("Weekend: no plan");
    if (issues.length === 0)
      throw new GateError("A plan needs at least one issue");
    if (new Set(issues).size !== issues.length)
      throw new GateError("Duplicate plan issue");
    if (issues.length > PLAN_CAP)
      throw new GateError(`Plan is capped at ${PLAN_CAP} issues`);
    return this.transaction((s) => {
      s.plan = {
        date: this.today(),
        items: issues,
        status: "proposed",
        ref: null,
        at: this.now(),
      };
      return s.plan;
    });
  }

  /**
   * A fresh "go" with no plan dated today picks up the last plan Joe saw.
   * Only the go carries it: an old approval never authorizes work by itself.
   */
  private carryOver(s: Json): Json {
    const old = s.plan;
    if (!old || old.status === "skipped" || this.weekend()) return null;
    const snapshot = s.snapshot;
    const open = snapshot
      ? new Set<number>(snapshot.issues.map((i: Json) => i.number))
      : null;
    const items = old.items.filter((n: number) => !open || open.has(n));
    if (items.length === 0) return null;
    s.plan = {
      date: this.today(),
      items,
      status: "proposed",
      ref: null,
      at: this.now(),
      carried_from: old.date,
    };
    return s.plan;
  }

  planApprove(reference: string): Json {
    if (!reference.trim())
      throw new GateError("Explicit user approval reference required");
    return this.transaction((s) => {
      const plan = this.todayPlan(s) ?? this.carryOver(s);
      if (!plan) throw new GateError("No plan for today yet");
      if (plan.status === "skipped") throw new GateError("Today was skipped");
      Object.assign(plan, {
        status: "approved",
        ref: reference,
        approved_at: this.now(),
      });
      return plan;
    });
  }

  planSkip(): Json {
    return this.transaction((s) => {
      const plan = this.todayPlan(s);
      if (!plan) throw new GateError("No plan for today yet");
      plan.status = "skipped";
      return plan;
    });
  }

  planAdd(issue: number, anyway = false): Json {
    return this.transaction((s) => {
      const plan = this.todayPlan(s);
      if (!plan) throw new GateError("No plan for today yet");
      if (plan.items.includes(issue))
        throw new GateError("Already in today's plan");
      if (plan.items.length >= PLAN_CAP && !anyway)
        throw new GateError(
          `Today is full (${PLAN_CAP}). Say "add anyway" to override.`,
        );
      plan.items.push(issue);
      return plan;
    });
  }

  // --- Task ledger: every promise is a task, so none can vanish ---

  taskAdd(text: string, source: string | null = null): Json {
    if (!text.trim()) throw new GateError("Task text is required");
    return this.transaction((s) => {
      const task = {
        id: Math.max(0, ...s.tasks.map((t: Json) => t.id)) + 1,
        text: text.trim(),
        source,
        status: "open",
        created_at: this.now(),
        closed_at: null,
        note: null,
      };
      s.tasks.push(task);
      return task;
    });
  }

  taskClose(taskId: number, status: string, note = ""): Json {
    if (status !== "done" && status !== "dropped")
      throw new GateError("Task status must be done or dropped");
    return this.transaction((s) => {
      const task = s.tasks.find((t: Json) => t.id === taskId);
      if (!task) throw new GateError("Unknown task");
      if (task.status !== "open") throw new GateError("Task is already closed");
      Object.assign(task, { status, note, closed_at: this.now() });
      return task;
    });
  }

  tasks(): Json {
    return this.transaction((s) =>
      s.tasks.filter((t: Json) => t.status === "open"),
    );
  }

  audit(issue: number, verdict: string, evidence: string, head: string): Json {
    if (!VERDICTS.includes(verdict))
      throw new GateError("Unknown relevance verdict");
    if (!evidence.trim()) throw new GateError("Evidence is required");
    this.transaction((s) => {
      const current = ((s.snapshot || {}).issues || []).find(
        (i: Json) => i.number === issue,
      );
      if (!current)
        throw new GateError("Issue is not in the current open issue snapshot");
      if (head !== s.snapshot.head)
        throw new GateError("Audit must reference current main SHA");
      s.audits[String(issue)] = {
        verdict,
        evidence,
        head,
        issue_updated_at: current.updated_at,
        reviewed_at: nowSeconds(),
      };
    });
    return { audited: issue, verdict };
  }

  queue(issues: number[]): Json {
    if (new Set(issues).size !== issues.length)
      throw new GateError("Duplicate queue issue");
    this.transaction((s) => {
      s.queue = issues;
      s.approved = null;
    });
    return { queue: issues, approved: false };
  }

  /** Return to board-driven dispatch without touching audits or reservations. */
  clearQueue(): Json {
    this.transaction((s) => {
      s.queue = [];
      s.approved = null;
    });
    return { queue: [], mode: "auto-dispatch" };
  }

  approveQueue(reference: string): Json {
    if (!reference.trim())
      throw new GateError("Explicit user approval reference required");
    this.transaction((s) => {
      if (!s.snapshot)
        throw new GateError("Sync GitHub before approving a queue");
      if (s.queue.length === 0) throw new GateError("Queue is empty");
      const issues = new Map<number, Json>(
        s.snapshot.issues.map((i: Json) => [i.number, i]),
      );
      if (
        s.queue.some((n: number) => {
          const audit = s.audits[String(n)] || {};
          return (
            !issues.has(n) ||
            audit.issue_updated_at !== issues.get(n).updated_at ||
            audit.verdict !== "needed"
          );
        })
      )
        throw new GateError("Queue includes issues not assessed as needed");
      const board = new Map<number, Json>(
        s.snapshot.board.map((i: Json) => [i.number, i]),
      );
      if (
        s.queue.some(
          (n: number) =>
            !board.has(n) ||
            board.get(n).status !== "Next" ||
            board.get(n).order == null,
        )
      )
        throw new GateError(
          "Queue must have Next status and explicit Execution order on board",
        );
      const orders: number[] = s.queue.map((n: number) => board.get(n).order);
      const sorted = [...orders].sort((a, b) => a - b);
      if (
        orders.some((o, i) => o !== sorted[i]) ||
        new Set(orders).size !== orders.length
      )
        throw new GateError("Board order must match the proposed queue");
      s.approved = {
        reference,
        at: nowSeconds(),
        board: Object.fromEntries(
          s.queue.map((n: number) => [
            String(n),
            {
              order: board.get(n).order,
              priority: board.get(n).priority ?? null,
            },
          ]),
        ),
      };
    });
    return { approved: true };
  }

  private eligible(s: Json, issue: number): void {
    if (s.paused) throw new GateError("Dispatch is paused");
    if (this.weekend()) throw new GateError("Weekend: no new work starts");
    if (s.queue.length && !s.approved)
      throw new GateError("Awaiting agreed priorities for manual queue");
    if (this.occupied(s) >= 5)
      throw new GateError("Five slots occupied; wait for a human merge");
    const existing = this.covered(s);
    const pending = s.queue.filter((n: number) => !existing.has(String(n)));
    if (
      s.snapshot.prs.some(
        (p: Json) =>
          p.head.ref === `codex/issue-${issue}` &&
          (p.head.repo || {}).full_name === REPO,
      )
    )
      throw new GateError(
        "Issue branch already has PR history; inspect and resume existing work",
      );
    if (s.approved) {
      if (pending.length === 0 || issue !== pending[0])
        throw new GateError("Issue is not next in the agreed queue");
      const currentBoard = new Map<string, Json>(
        s.snapshot.board.map((i: Json) => [String(i.number), i]),
      );
      for (const n of pending) {
        const b = currentBoard.get(String(n)) || {};
        const approved = s.approved.board[String(n)];
        if (
          !approved ||
          (b.order ?? null) !== approved.order ||
          (b.priority ?? null) !== approved.priority
        )
          throw new GateError(
            "Board priorities/order changed; agree and approve the queue again",
          );
      }
    } else {
      const plan = this.todayPlan(s);
      if (!plan || plan.status !== "approved")
        throw new GateError('Needs today\'s plan approved by Joe ("go")');
      const remaining = plan.items.filter(
        (n: number) => !existing.has(String(n)),
      );
      if (remaining.length === 0 || issue !== remaining[0])
        throw new GateError("Issue is not next in today's approved plan");
    }
    const audit = s.audits[String(issue)] || {};
    const current = s.snapshot.issues.find((i: Json) => i.number === issue);
    if (
      !current ||
      audit.verdict !== "needed" ||
      audit.head !== s.snapshot.head ||
      audit.issue_updated_at !== current.updated_at
    )
      throw new GateError(
        "Revalidate selected issue against current main before starting",
      );
    const board = s.snapshot.board.find((i: Json) => i.number === issue);
    if (!board || board.status !== "Next")
      throw new GateError("Selected issue must be Next on the board");
    if ((current.labels || []).some((l: Json) => BLOCKING_LABELS.has(l.name)))
      throw new GateError(
        "Issue requires human input, design, dependencies, or decomposition",
      );
  }

  claim(issue: number, fetch: Fetch): Json {
    // Network refresh is INSIDE the transaction: concurrent claimants cannot use
    // an older snapshot to erase another claimant's reservation.
    let error: unknown = null;
    let result: Json = null;
    this.transaction((s) => {
      this.syncInto(s, fetch());
      try {
        this.eligible(s, issue);
      } catch (e) {
        error = e;
        return;
      }
      s.reservations[String(issue)] = {
        branch: `codex/issue-${issue}`,
        pr: null,
        started_at: nowSeconds(),
        seen_prs: s.snapshot.prs.map((p: Json) => p.number),
      };
      result = { issue, ...s.reservations[String(issue)] };
    });
    if (error) throw error;
    return result;
  }

  checkPr(issue: number, fetch: Fetch): Json {
    return this.transaction((s) => {
      this.syncInto(s, fetch());
      const r = s.reservations[String(issue)];
      if (!r) throw new GateError("No reservation for this issue");
      if (r.pr != null)
        throw new GateError("PR already exists; maintain it instead");
      if (this.occupied(s) > 5)
        throw new GateError("External PRs filled capacity; hold this work");
      if (s.paused)
        throw new GateError("Dispatch paused; do not publish new PR");
      return { issue, ...r };
    });
  }

  bind(issue: number, number: number, fetch: Fetch): Json {
    this.transaction((s) => {
      this.syncInto(s, fetch());
      const r = s.reservations[String(issue)];
      const p = s.prs[String(number)];
      if (
        !r ||
        !p ||
        p.head.ref !== r.branch ||
        (p.head.repo || {}).full_name !== REPO
      )
        throw new GateError("PR does not match reserved issue branch");
      r.pr = number;
    });
    return { issue, pr: number };
  }
}

function gh(...args: string[]): Json {
  const result = Bun.spawnSync(["gh", ...args], {
    stdout: "pipe",
    stderr: "pipe",
    timeout: 90_000,
  });
  if (result.exitCode !== 0)
    throw new GateError(
      "GitHub read failed: " + result.stderr.toString().trim().slice(0, 400),
    );
  return JSON.parse(result.stdout.toString());
}

export function fetchSnapshot(
  manager: Manager,
  issue: number | null = null,
): Json {
  const pages = (endpoint: string): Json[] =>
    gh("api", "--paginate", "--slurp", endpoint).flat();
  const prs = pages(`repos/${REPO}/pulls?state=open&per_page=100`);
  const saved = manager.readSaved();
  const present = new Set(prs.map((p: Json) => String(p.number)));
  for (const [key, old] of Object.entries<Json>(saved.prs))
    if (!present.has(key))
      prs.push(old.merged_at ? old : gh("api", `repos/${REPO}/pulls/${key}`));
  if (issue != null) {
    const known = new Set(prs.map((p: Json) => p.number));
    const history = pages(
      `repos/${REPO}/pulls?state=all&head=rollercoaster-dev:codex/issue-${issue}&per_page=100`,
    );
    prs.push(...history.filter((p: Json) => !known.has(p.number)));
  }
  const issues = pages(`repos/${REPO}/issues?state=open&per_page=100`).filter(
    (i: Json) => !("pull_request" in i),
  );
  const project = gh(
    "project",
    "item-list",
    "14",
    "--owner",
    "rollercoaster-dev",
    "--limit",
    "10000",
    "--format",
    "json",
  );
  if (project.totalCount !== project.items.length)
    throw new GateError("Board pagination incomplete");
  const board = project.items
    .filter(
      (i: Json) =>
        (i.content || {}).type === "Issue" &&
        i.repository === `https://github.com/${REPO}`,
    )
    .map((i: Json) => ({
      number: i.content.number,
      status: i.status ?? null,
      priority: i.priority ?? null,
      order: i["execution order"] ?? null,
    }));
  return {
    prs,
    issues,
    board,
    head: gh("api", `repos/${REPO}/commits/main`).sha,
  };
}

// --- CLI ---------------------------------------------------------------

const USAGE = `usage: pm.ts [--state-dir DIR] COMMAND
commands: status snapshot sync pause resume clear-queue
  audit ISSUE VERDICT --evidence TEXT --head SHA | queue ISSUE... | approve-queue --approval-ref TEXT
  plan-propose ISSUE... | plan-approve --approval-ref TEXT | plan-skip | plan-add ISSUE [--anyway]
  tasks | task-add TEXT [--source S] | task-done ID [--note T] | task-drop ID [--note T]
  claim ISSUE | check-pr ISSUE | bind ISSUE PR`;

class UsageError extends Error {}

function parseArgs(argv: string[]): {
  stateDir: string;
  command: string;
  positional: string[];
  flags: Record<string, string | true>;
} {
  let stateDir = DEFAULT_STATE;
  const rest = [...argv];
  if (rest[0] === "--state-dir") {
    if (!rest[1]) throw new UsageError("--state-dir needs a value");
    stateDir = rest[1];
    rest.splice(0, 2);
  }
  const command = rest.shift();
  if (!command) throw new UsageError("command required");
  const positional: string[] = [];
  const flags: Record<string, string | true> = {};
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (arg === "--anyway") flags.anyway = true;
    else if (arg.startsWith("--")) {
      if (rest[i + 1] === undefined)
        throw new UsageError(`${arg} needs a value`);
      flags[arg.slice(2)] = rest[++i];
    } else positional.push(arg);
  }
  return { stateDir, command, positional, flags };
}

function int(value: string | undefined): number {
  if (value === undefined || !/^-?\d+$/.test(value))
    throw new UsageError(`expected an integer, got ${value}`);
  return Number(value);
}

function required(flags: Record<string, string | true>, name: string): string {
  const value = flags[name];
  if (typeof value !== "string") throw new UsageError(`--${name} is required`);
  return value;
}

export function main(argv: string[] = process.argv.slice(2)): number {
  let parsed;
  try {
    parsed = parseArgs(argv);
  } catch (e) {
    console.error(`${USAGE}\nerror: ${(e as Error).message}`);
    return 2;
  }
  const { stateDir, command, positional, flags } = parsed;
  const manager = new Manager(stateDir);
  let issueArg: number | null = null;
  const fetch = () => fetchSnapshot(manager, issueArg);
  try {
    if (["claim", "check-pr", "bind"].includes(command))
      issueArg = int(positional[0]);
    let result: Json;
    switch (command) {
      case "status":
        result = manager.status();
        break;
      case "snapshot":
        result = manager.snapshot();
        break;
      case "pause":
        result = manager.pause();
        break;
      case "resume":
        result = manager.resume();
        break;
      case "clear-queue":
        result = manager.clearQueue();
        break;
      case "sync":
        result = manager.sync(fetch());
        break;
      case "plan-propose":
        result = manager.planPropose(positional.map(int));
        break;
      case "plan-approve":
        result = manager.planApprove(required(flags, "approval-ref"));
        break;
      case "plan-skip":
        result = manager.planSkip();
        break;
      case "plan-add":
        result = manager.planAdd(int(positional[0]), flags.anyway === true);
        break;
      case "tasks":
        result = manager.tasks();
        break;
      case "task-add":
        result = manager.taskAdd(
          positional[0] ?? "",
          typeof flags.source === "string" ? flags.source : null,
        );
        break;
      case "task-done":
      case "task-drop":
        result = manager.taskClose(
          int(positional[0]),
          command === "task-done" ? "done" : "dropped",
          typeof flags.note === "string" ? flags.note : "",
        );
        break;
      case "audit":
        result = manager.audit(
          int(positional[0]),
          positional[1] ?? "",
          required(flags, "evidence"),
          required(flags, "head"),
        );
        break;
      case "queue":
        if (positional.length === 0)
          throw new UsageError("queue needs at least one issue");
        result = manager.queue(positional.map(int));
        break;
      case "approve-queue":
        manager.sync(fetch());
        result = manager.approveQueue(required(flags, "approval-ref"));
        break;
      case "claim":
        result = manager.claim(issueArg!, fetch);
        break;
      case "check-pr":
        result = manager.checkPr(issueArg!, fetch);
        break;
      case "bind":
        result = manager.bind(issueArg!, int(positional[1]), fetch);
        break;
      default:
        throw new UsageError(`unknown command ${command}`);
    }
    console.log(JSON.stringify(result));
    return 0;
  } catch (e) {
    if (e instanceof UsageError) {
      console.error(`${USAGE}\nerror: ${e.message}`);
      return 2;
    }
    if (e instanceof GateError) {
      console.log(JSON.stringify({ error: e.message }));
      return 1;
    }
    throw e;
  }
}

if (import.meta.main) process.exit(main());
