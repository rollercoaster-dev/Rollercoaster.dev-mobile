import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as tb from "./telegram_bridge";

/* eslint-disable @typescript-eslint/no-explicit-any */
const at = (y: number, mo: number, d: number, h: number, mi = 0) =>
  Date.UTC(y, mo - 1, d, h - 1, mi) / 1000; // Berlin (CET, UTC+1)
const MONDAY_NOON = at(2026, 11, 9, 12);

class FakeHTTP implements tb.Http {
  updates: any[] = [];
  sent: any[] = [];
  failSend = false;
  offsets: number[] = [];

  async call(method: string, payload: any): Promise<unknown> {
    if (method === "getUpdates") {
      this.offsets.push(payload.offset);
      return this.updates;
    }
    if (this.failSend) throw new tb.BridgeError("delivery failed");
    this.sent.push(payload);
    return { message_id: this.sent.length };
  }
}

function update(
  uid = 1,
  text = "hello",
  user = 42,
  chat = 42,
  extra: Record<string, unknown> = {},
): any {
  return {
    update_id: uid,
    message: {
      message_id: uid,
      text,
      chat: { id: chat, type: "private" },
      from: { id: user, is_bot: false },
      ...extra,
    },
  };
}

describe("Bridge", () => {
  let root: string;
  let http: FakeHTTP;
  let clock: number[];
  let bridge: tb.Bridge;
  const bridges: tb.Bridge[] = [];
  const config: tb.Config = { token: "secret", chatId: 42, userId: 42 };

  const makeBridge = () => {
    const b = new tb.Bridge(
      join(root, "state"),
      root,
      config,
      http,
      () => clock[0],
    );
    bridges.push(b);
    return b;
  };
  const unhandled = (b: tb.Bridge) =>
    (b.db.query("SELECT count(*) AS n FROM inbox WHERE handled=0").get() as any)
      .n;
  const fakePm = (body: string) => {
    const dir = join(root, "scripts/project_manager");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "pm.ts"),
      `import { appendFileSync, existsSync, writeFileSync } from "node:fs";\nconst dir = process.argv[3];\nconst args = process.argv.slice(4);\n` +
        `appendFileSync(dir + "/calls", args.join(" ") + "\\n");\n` +
        body,
    );
  };

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "bridge-"));
    http = new FakeHTTP();
    clock = [MONDAY_NOON];
    bridge = makeBridge();
  });
  afterEach(() => {
    for (const b of bridges.splice(0)) b.close();
    rmSync(root, { recursive: true, force: true });
  });

  test("unauthorized, bot and forwarded updates never enter inbox", async () => {
    http.updates = [
      update(1, "hello", 7),
      update(2, "hello", 42, 7),
      update(3, "hello", 42, 42, { forward_origin: { type: "user" } }),
      update(4, "hello", 42, 42, { from: { id: 42, is_bot: true } }),
    ];
    await bridge.once();
    expect(bridge.inbox()).toEqual([]);
    expect(bridge.offset()).toBe(5);
    expect(http.sent).toEqual([]);
  });

  test("restart deduplicates inbound and acknowledgement", async () => {
    http.updates = [update(8)];
    await bridge.once();
    const restarted = makeBridge();
    await restarted.once();
    expect(restarted.inbox()).toHaveLength(1);
    expect(http.sent).toHaveLength(1);
    expect(http.offsets).toEqual([0, 9]);
  });

  test("failed reply stays durable and marks handled only after send", async () => {
    http.updates = [update()];
    await bridge.once();
    http.failSend = true;
    bridge.reply(1, "done");
    await bridge.flush();
    expect(bridge.inbox()).toHaveLength(1);
    expect(bridge.health().pending_outbox).toBe(1);
    const restarted = makeBridge();
    http.failSend = false;
    await restarted.flush();
    expect(restarted.inbox()).toEqual([]);
    expect(http.sent.at(-1).text).toBe("done");
    expect(http.sent.at(-1)).not.toHaveProperty("parse_mode");
  });

  test("notification key deduplicates", async () => {
    bridge.send("notice", "same");
    await bridge.flush();
    bridge.send("notice", "same");
    await bridge.flush();
    expect(http.sent).toHaveLength(1);
  });

  test("status, pause, resume route to the pm script without a shell", async () => {
    fakePm(
      `console.log(JSON.stringify({mode: args[0], counts: {ready: 2}, prs: ["https://example/pr/1"], audit: "ok"}));\n`,
    );
    http.updates = [
      update(1, "/status"),
      update(2, "pause"),
      update(3, "/resume"),
    ];
    await bridge.once();
    expect(readFileSync(join(root, "state/calls"), "utf8")).toBe(
      "status\npause\nresume\n",
    );
    expect(bridge.inbox()).toEqual([]);
    expect(http.sent[0].text).toContain("ready");
    expect(http.sent[0].text).toContain("https://example/pr/1");
  });

  test("failed persistence does not advance offset", async () => {
    http.updates = [update(12)];
    bridge.db.run(
      "CREATE TRIGGER reject_inbox BEFORE INSERT ON inbox BEGIN SELECT RAISE(ABORT, 'disk error'); END",
    );
    await expect(bridge.once()).rejects.toThrow();
    expect(bridge.offset()).toBe(0);
  });

  test("receiver lock is exclusive", async () => {
    await tb.withLock(root, async () => {
      await expect(tb.withLock(root, () => undefined)).rejects.toThrow(
        tb.BridgeError,
      );
    });
    await tb.withLock(root, () => undefined); // released afterwards
  });

  test("credentials parse without execution and group requires user", () => {
    const env = join(root, "env");
    writeFileSync(
      env,
      'export TELEGRAM_BOT_TOKEN="secret"\nTELEGRAM_CHAT_ID=42\n',
    );
    expect(tb.loadConfig(env).userId).toBe(42);
    writeFileSync(env, 'TELEGRAM_BOT_TOKEN="secret"\nTELEGRAM_CHAT_ID=-42\n');
    expect(() => tb.loadConfig(env)).toThrow(tb.BridgeError);
    writeFileSync(
      env,
      "TELEGRAM_BOT_TOKEN=$(touch NEVER)\nTELEGRAM_CHAT_ID=42\n",
    );
    expect(() => tb.loadConfig(env)).toThrow(tb.BridgeError);
  });

  test("status summarizes manager counts without dumping PR bodies", () => {
    const text = tb.formatStatus({
      mode: "audit",
      paused: false,
      queue_approved: false,
      occupied: 2,
      limit: 5,
      issue_count: 7,
      unaudited: [4, 8],
      audits: { 1: {} },
      queue: [1, 2],
      reservations: {},
      prs: [
        {
          number: 12,
          state: "open",
          html_url: "https://example/pr/12",
          title: "Fix",
          body: "PRIVATE BODY",
        },
      ],
    });
    expect(text).toContain("2/5");
    expect(text).toContain("2 remaining");
    expect(text).toContain("https://example/pr/12");
    expect(text).not.toContain("PRIVATE BODY");
  });

  test("status names an older plan by its date, not as today's", () => {
    const text = tb.formatStatus({
      occupied: 0,
      plan: null,
      last_plan: { date: "2026-11-09", items: [776, 765], status: "proposed" },
    });
    expect(text).toContain(
      "Plan: none today. Last (2026-11-09): #776 #765, go starts it",
    );
  });

  test("status uses pending queue after completed prefix", () => {
    const text = tb.formatStatus({
      occupied: 2,
      queue: [1, 2, 3, 4, 5],
      pending_queue: [4, 5],
    });
    expect(text).toContain("Queue: #4, #5");
    expect(text).not.toContain("#1");
    expect(text.split("\n").length).toBeLessThanOrEqual(tb.MAX_LINES);
  });

  test("failed commands stay out of natural-language inbox", async () => {
    http.updates = [update(1, "/pause"), update(2, "next please")];
    await bridge.once();
    expect(bridge.inbox().map((r: any) => r.update_id)).toEqual([2]);
    expect(bridge.health().last_poll).not.toBeNull();
    expect(bridge.health().last_error).not.toBeNull();
  });

  test("failed resume retries before newer pause", async () => {
    fakePm(
      `if (args[0] === "resume" && !existsSync(dir + "/retry")) { writeFileSync(dir + "/retry", ""); process.exit(1); }\n` +
        `writeFileSync(dir + "/mode", args[0]);\nconsole.log(JSON.stringify({mode: args[0]}));\n`,
    );
    http.updates = [update(1, "/resume"), update(2, "/pause")];
    await bridge.once();
    await bridge.once();
    expect(readFileSync(join(root, "state/mode"), "utf8")).toBe("pause");
    expect(unhandled(bridge)).toBe(0);
  });

  test("HTTP errors redact token and attempts are bounded", async () => {
    let calls = 0;
    const failing = async () => {
      calls++;
      throw new Error("secret");
    };
    const http3 = new tb.TelegramHTTP(config, failing, async () => {});
    const error = (await http3
      .call("getUpdates", { timeout: 0 })
      .catch((e: unknown) => e)) as Error;
    expect(error).toBeInstanceOf(tb.BridgeError);
    expect(String(error.message)).not.toContain("secret");
    expect(calls).toBe(3);
  });

  test("plain words ignore case, punctuation and slash", () => {
    for (const [text, word] of [
      ["OFF!", "pause"],
      ["/on", "resume"],
      ["Go.", "go"],
      ["stop", "stop"],
      ["Skip", "skip"],
    ])
      expect(tb.controlWord(text)).toBe(word);
    expect(tb.controlWord("go fix the login screen please")).toBeNull();
  });

  test("go approves today's plan with a traceable reference", async () => {
    fakePm(
      `console.log(JSON.stringify({items: [101, 102], status: "approved"}));\n`,
    );
    http.updates = [update(5, "go")];
    await bridge.once();
    expect(readFileSync(join(root, "state/calls"), "utf8")).toBe(
      "plan-approve --approval-ref Telegram update 5: go\n",
    );
    expect(http.sent[0].text).toContain("#101, #102");
  });

  test("gate refusal is answered, not retried", async () => {
    fakePm(
      `console.log(JSON.stringify({error: "No plan for today yet"}));\nprocess.exit(1);\n`,
    );
    http.updates = [update(5, "go")];
    await bridge.once();
    await bridge.once();
    expect(http.sent.map((m) => m.text)).toEqual(["No plan for today yet."]);
    expect(unhandled(bridge)).toBe(0);
  });

  test("long messages are refused", () => {
    expect(() => bridge.send(Array(6).fill("line").join("\n"), "k")).toThrow(
      tb.RefusedError,
    );
    expect(() => bridge.send("x".repeat(800), "k")).toThrow(tb.RefusedError);
    bridge.send(Array(5).fill("line").join("\n"), "k");
  });

  test("quiet hours and weekends refuse notifications but not replies", async () => {
    http.updates = [update(1, "hi")];
    await bridge.once();
    for (const when of [
      at(2026, 11, 9, 22),
      at(2026, 11, 10, 7, 59),
      at(2026, 11, 14, 12),
    ]) {
      clock[0] = when;
      expect(() => bridge.send("ping", "k")).toThrow(tb.RefusedError);
    }
    bridge.reply(1, "Answer to your message");
  });

  test("stop mutes notifications and any message unmutes", async () => {
    http.updates = [update(1, "STOP")];
    await bridge.once();
    expect(http.sent.at(-1).text).toContain("Muted");
    expect(() => bridge.send("ping", "k")).toThrow(/muted/);
    http.updates = [update(2, "ok")];
    await bridge.once();
    bridge.send("ping", "k");
  });

  test("one open question at a time", async () => {
    bridge.send("Which first?", "q1", true);
    expect(() => bridge.send("And this?", "q2", true)).toThrow(/already open/);
    bridge.send("Plain update", "n1");
    http.updates = [update(1, "#101")];
    await bridge.once();
    bridge.send("And this?", "q2", true);
  });

  test("free text starts listener and falls back honestly", async () => {
    const dir = join(root, "scripts/project_manager");
    mkdirSync(dir, { recursive: true });
    const script = join(dir, "listen.sh");
    writeFileSync(script, '#!/bin/sh\necho "$1" > "$(dirname "$0")/heard"\n');
    chmodSync(script, 0o755);
    http.updates = [update(3, "what is next?")];
    await bridge.once();
    await bridge.listener!.exited;
    expect(readFileSync(join(dir, "heard"), "utf8").trim()).toBe("3");
    http.updates = [];
    await bridge.once();
    expect(http.sent.at(-1).text).toContain("Couldn't answer");
    expect(bridge.inbox().map((r: any) => r.update_id)).toEqual([3]);
    await bridge.once();
    expect(http.sent).toHaveLength(1);
  });

  test("history merges Joe and delivered bot messages oldest first", async () => {
    const t = at(2026, 11, 9, 13, 0);
    bridge.db.run(
      "INSERT INTO inbox (update_id,text,message_id,command,received_at) VALUES (1,'status',1,'status',?), (2,'fixed',2,NULL,?)",
      [t, t + 120],
    );
    bridge.db.run(
      "INSERT INTO outbox (dedup_key,text,update_id,sent,created_at) VALUES ('a','Token lacks read:project',NULL,1,?), ('b','queued, not sent',NULL,0,?)",
      [t + 60, t + 90],
    );
    expect(bridge.history()).toEqual([
      "[Mon 13:00] Joe (update 1): status",
      "[Mon 13:01] Bot: Token lacks read:project",
      "[Mon 13:02] Joe (update 2): fixed",
    ]);
    expect(bridge.history(2)).toEqual([
      "[Mon 13:01] Bot: Token lacks read:project",
      "[Mon 13:02] Joe (update 2): fixed",
    ]);
  });

  test("pin sends one silent pinned message, then edits it only when text changes", async () => {
    const calls: [string, any][] = [];
    http.call = async (method: string, payload: any) => {
      calls.push([method, payload]);
      return { message_id: 77 };
    };
    expect(await bridge.pin("⚪ Idle.")).toBe(true);
    expect(calls.map((c) => c[0])).toEqual(["sendMessage", "pinChatMessage"]);
    expect(calls[0][1].disable_notification).toBe(true);
    expect(calls[1][1]).toMatchObject({
      message_id: 77,
      disable_notification: true,
    });
    expect(await bridge.pin("⚪ Idle.")).toBe(false);
    await bridge.pin("🟢 Work tick running.");
    expect(calls.map((c) => c[0])).toEqual([
      "sendMessage",
      "pinChatMessage",
      "editMessageText",
    ]);
    expect(calls[2][1]).toMatchObject({
      message_id: 77,
      text: "🟢 Work tick running.",
    });
  });

  test("pin re-creates the message when the old one can't be edited", async () => {
    const calls: string[] = [];
    let next = 5;
    http.call = async (method: string) => {
      calls.push(method);
      if (method === "editMessageText") throw new tb.BridgeError("gone");
      return { message_id: next++ };
    };
    await bridge.pin("a");
    await bridge.pin("b");
    expect(calls).toEqual([
      "sendMessage",
      "pinChatMessage",
      "editMessageText",
      "sendMessage",
      "pinChatMessage",
    ]);
  });

  test("pinned status shows the open question until Joe answers", async () => {
    fakePm(
      `console.log(JSON.stringify({ paused: false, plan: null, prs: [], open_tasks: [] }));`,
    );
    bridge.send("Merge order? 814 first or 815?", "q", true);
    expect(bridge.pinStatus()).toContain(
      "WAITING ON YOU: Merge order? 814 first or 815?",
    );
    http.updates = [update(1, "814 first")];
    await bridge.once();
    expect(bridge.pinStatus()).not.toContain("WAITING ON YOU");
  });

  test("pinned status reads run.json: running with current step, then failed", () => {
    fakePm(
      `console.log(JSON.stringify({ paused: false, plan: null, prs: [], open_tasks: [] }));`,
    );
    const state = join(root, "state");
    writeFileSync(
      join(state, "run.json"),
      JSON.stringify({
        mode: "tick",
        started_at: MONDAY_NOON - 600,
        pid: process.pid,
      }),
    );
    writeFileSync(
      join(state, "now.json"),
      JSON.stringify({
        text: "building #814 on Android",
        at: MONDAY_NOON - 60,
      }),
    );
    expect(bridge.pinStatus()).toBe(
      "🟢 Work tick running since 11:50 (10 min).\nNOW: building #814 on Android",
    );
    writeFileSync(
      join(state, "run.json"),
      JSON.stringify({
        mode: "tick",
        started_at: MONDAY_NOON - 600,
        ended_at: MONDAY_NOON - 590,
        exit: 1,
      }),
    );
    expect(bridge.pinStatus()).toBe(
      "🔴 Work tick failed at 11:50. Next run 12:30.",
    );
  });

  test("python-era telegram database keeps offset and inbox", async () => {
    bridge.db.run("UPDATE metadata SET value='35057421' WHERE key='offset'");
    bridge.db.run(
      "INSERT INTO inbox (update_id,text,message_id,command,received_at) VALUES (35057420,'old',9,NULL,1)",
    );
    bridge.close();
    const reopened = makeBridge();
    expect(reopened.offset()).toBe(35057421);
    expect(reopened.inbox().map((r: any) => r.text)).toEqual(["old"]);
  });
});

describe("pinText", () => {
  const base = { paused: false, plan: null, prs: [], open_tasks: [] };

  test("idle shows the next scheduled run", () => {
    expect(
      tb.pinText({
        now: MONDAY_NOON,
        status: base,
        run: null,
        running: false,
        step: null,
        ask: null,
      }),
    ).toBe("⚪ Idle. Next run 12:30.");
  });

  test("a run whose process vanished without an end record reads as died", () => {
    const run = { mode: "tick", started_at: MONDAY_NOON - 1800, pid: 1 };
    expect(
      tb.pinText({
        now: MONDAY_NOON,
        status: base,
        run,
        running: false,
        step: null,
        ask: null,
      }),
    ).toBe("🔴 Work tick from 11:30 died. Next run 12:30.");
  });

  test("a step from an earlier run is not shown", () => {
    const run = { mode: "tick", started_at: MONDAY_NOON - 60, pid: 1 };
    const text = tb.pinText({
      now: MONDAY_NOON,
      status: base,
      run,
      running: true,
      step: { text: "old", at: MONDAY_NOON - 3600 },
      ask: null,
    });
    expect(text).toBe("🟢 Work tick running since 11:59 (1 min).");
  });

  test("paused, plan, PR links and tasks", () => {
    const status = {
      paused: true,
      plan: { items: [814, 815], status: "approved" },
      prs: [
        {
          number: 814,
          state: "open",
          html_url: "https://github.com/o/r/pull/814",
        },
        { number: 800, state: "closed" },
      ],
      open_tasks: [{ id: 8, text: "Port the pinned status" }],
    };
    expect(
      tb.pinText({
        now: MONDAY_NOON,
        status,
        run: null,
        running: false,
        step: null,
        ask: null,
      }),
    ).toBe(
      "⏸ Off: no new work until you say on.\nPlan: #814 #815 (go given)\nPRs (1): https://github.com/o/r/pull/814\nTasks (1): 8. Port the pinned status",
    );
  });

  test("nextRun follows the weekday 09:00-18:00 schedule", () => {
    expect(tb.nextRun(at(2026, 11, 9, 7))).toBe("09:00");
    expect(tb.nextRun(at(2026, 11, 9, 9, 10))).toBe("09:30");
    expect(tb.nextRun(at(2026, 11, 9, 17, 45))).toBe("18:00");
    expect(tb.nextRun(at(2026, 11, 9, 19))).toBe("tomorrow 09:00");
    expect(tb.nextRun(at(2026, 11, 13, 19))).toBe("Mon 09:00");
    expect(tb.nextRun(at(2026, 11, 14, 12))).toBe("Mon 09:00");
  });
});
