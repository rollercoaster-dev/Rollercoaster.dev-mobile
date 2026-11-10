import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { GateError, linkedIssues, Manager } from "./pm";

/* eslint-disable @typescript-eslint/no-explicit-any */
const MONDAY = Date.UTC(2026, 10, 9, 9, 0) / 1000; // 10:00 Berlin
const SATURDAY = Date.UTC(2026, 10, 14, 9, 0) / 1000;

function pr(
  n: number,
  opts: {
    state?: string;
    author?: string;
    branch?: string;
    merged?: boolean;
    draft?: boolean;
  } = {},
): any {
  const {
    state = "open",
    author = "joeczar",
    branch,
    merged = false,
    draft = false,
  } = opts;
  return {
    number: n,
    state,
    user: { login: author },
    head: {
      ref: branch ?? `codex/issue-${n}`,
      repo: { full_name: "rollercoaster-dev/Rollercoaster.dev-mobile" },
    },
    merged_at: merged ? "2026-09-20T12:00:00Z" : null,
    merged_by: merged ? { login: "joeczar", type: "User" } : null,
    draft,
    body: `Closes #${n}`,
    html_url: `https://github.com/x/y/pull/${n}`,
  };
}

const range = (a: number, b: number) =>
  Array.from({ length: b - a }, (_, i) => a + i);

function snapshot(
  opts: { prs?: any[]; issues?: number[]; head?: string } = {},
): any {
  const { prs = [], issues = range(100, 108), head = "abc" } = opts;
  return {
    prs: [...prs],
    issues: issues.map((n) => ({
      number: n,
      title: `Issue ${n}`,
      updated_at: "today",
      labels: [],
    })),
    head,
    board: issues.map((n, i) => ({ number: n, status: "Next", order: i })),
  };
}

const gate = (fn: () => unknown, message?: string | RegExp) => {
  expect(fn).toThrow(GateError);
  if (message) expect(fn).toThrow(message);
};

describe("Manager", () => {
  let path: string;
  let clock: number[];
  let m: Manager;

  beforeEach(() => {
    path = mkdtempSync(join(tmpdir(), "pm-"));
    clock = [MONDAY];
    m = new Manager(path, () => clock[0]);
  });
  afterEach(() => rmSync(path, { recursive: true, force: true }));

  const ready = (data: any) => {
    m.sync(data);
    for (const issue of data.issues)
      m.audit(
        issue.number,
        "needed",
        "Current code still lacks acceptance behavior",
        "abc",
      );
    m.queue(data.issues.map((i: any) => i.number));
    m.approveQueue("User message: approve this exact queue");
  };
  const go = (...issues: number[]) => {
    m.planPropose(issues);
    m.planApprove("Telegram update 1: go");
  };

  test("five PRs block start even if drafts", () => {
    const data = snapshot({
      prs: range(1, 6).map((n) => pr(n, { draft: true })),
    });
    ready(data);
    gate(() => m.claim(100, () => data));
    expect(m.status().occupied).toBe(5);
  });

  test("reservation counts and duplicate claim does not start worker twice", () => {
    const data = snapshot({ prs: range(1, 5).map((n) => pr(n)) });
    ready(data);
    m.claim(100, () => data);
    expect(new Manager(path, () => clock[0]).status().occupied).toBe(5);
    gate(() => m.claim(100, () => data));
    gate(() => m.claim(101, () => data));
  });

  test("dependencies and verified release bot do not consume slots", () => {
    const data = snapshot({
      prs: [
        pr(1, { author: "dependabot[bot]" }),
        pr(2, {
          author: "github-actions[bot]",
          branch: "release-please--branches--main",
        }),
      ],
    });
    ready(data);
    m.claim(100, () => data);
    expect(m.status().occupied).toBe(1);
  });

  test("human dependency label or release title does not bypass cap", () => {
    const data = snapshot({
      prs: range(1, 6).map((n) =>
        pr(n, { branch: "release-please--branches--main" }),
      ),
    });
    ready(data);
    gate(() => m.claim(100, () => data));
  });

  test("closed without merge holds slot, merge releases", () => {
    const data = snapshot({ prs: range(1, 6).map((n) => pr(n)) });
    ready(data);
    const closed = snapshot({
      prs: [pr(1, { state: "closed" }), ...range(2, 6).map((n) => pr(n))],
    });
    gate(() => m.claim(100, () => closed));
    expect(m.status().occupied).toBe(5);
    const merged = snapshot({
      prs: [
        pr(1, { state: "closed", merged: true }),
        ...range(2, 6).map((n) => pr(n)),
      ],
    });
    m.claim(100, () => merged);
    expect(m.status().occupied).toBe(5);
  });

  test("another actor merge does not release Joe's slot", () => {
    const data = snapshot({ prs: range(1, 6).map((n) => pr(n)) });
    ready(data);
    const merged = pr(1, { state: "closed", merged: true });
    merged.merged_by = { login: "some-bot[bot]", type: "Bot" };
    gate(() =>
      m.claim(100, () =>
        snapshot({ prs: [merged, ...range(2, 6).map((n) => pr(n))] }),
      ),
    );
    expect(m.status().occupied).toBe(5);
  });

  test("manual queue requires only queued issues audited and approval", () => {
    const data = snapshot();
    m.sync(data);
    m.audit(100, "needed", "Evidence", "abc");
    m.queue([100]);
    gate(() => m.claim(100, () => data));
    m.approveQueue("User approved issue 100");
    m.claim(100, () => data);
    expect(m.status().occupied).toBe(1);
  });

  test("auto dispatch needs selected issue audit, not entire backlog", () => {
    const data = snapshot();
    m.sync(data);
    expect(m.status().next_auto_issue).toBe(100);
    go(100);
    gate(() => m.claim(100, () => data), "Revalidate selected issue");
    m.audit(100, "needed", "Inspected current code and acceptance", "abc");
    m.claim(100, () => data);
    expect(m.status().occupied).toBe(1);
    expect(m.status().next_auto_issue).toBe(101);
  });

  test("auto dispatch skips human gate and audited obsolete work", () => {
    const data = snapshot({ issues: range(100, 103) });
    data.issues[0].labels = [{ name: "hitl" }];
    m.sync(data);
    expect(m.status().next_auto_issue).toBe(101);
    m.audit(101, "superseded", "Current implementation supersedes it", "abc");
    expect(m.status().next_auto_issue).toBe(102);
    m.sync({ ...data, head: "new" });
    expect(m.status().next_auto_issue).toBe(101);
    m.sync(data);
    m.audit(102, "needed", "Current code lacks acceptance behavior", "abc");
    go(102);
    m.claim(102, () => data);
  });

  test("auto dispatch allows independent workers up to cap", () => {
    const data = snapshot({ issues: range(100, 106) });
    m.sync(data);
    go(100, 101, 102);
    for (const n of [103, 104, 105]) m.planAdd(n, true);
    for (const n of range(100, 105)) {
      m.audit(n, "needed", `Issue ${n} remains needed`, "abc");
      m.claim(n, () => data);
    }
    expect(m.status().occupied).toBe(5);
    m.audit(105, "needed", "Issue 105 remains needed", "abc");
    gate(() => m.claim(105, () => data), "Five slots occupied");
  });

  test("existing issue URL in PR prevents duplicate auto dispatch", () => {
    const p = pr(999, { branch: "codex/other-work" });
    p.body =
      "Implements https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/issues/100";
    expect([...linkedIssues(p)]).toEqual([100]);
    m.sync(snapshot({ prs: [p] }));
    expect(m.status().next_auto_issue).toBe(101);
  });

  test("pause/resume does not grant priority approval", () => {
    m.pause();
    m.resume();
    expect(m.status().queue_approved).toBe(false);
  });

  test("clearing a stale manual queue returns to auto without losing reservations", () => {
    const data = snapshot();
    m.sync(data);
    m.queue([101]);
    expect(m.status().mode).toBe("awaiting-queue-approval");
    m.clearQueue();
    expect(m.status().next_auto_issue).toBe(100);
    m.audit(100, "needed", "Current code lacks behavior", "abc");
    go(100);
    m.claim(100, () => data);
    m.queue([101]);
    m.clearQueue();
    expect(m.status().reservations).toHaveProperty("100");
  });

  test("changed head requires selected issue revalidation", () => {
    ready(snapshot());
    gate(() => m.claim(100, () => snapshot({ head: "new" })));
  });

  test("changed selected issue requires re-audit but new unrelated issue does not", () => {
    ready(snapshot());
    m.claim(100, () => snapshot({ issues: range(100, 109) }));
    const data = snapshot({ issues: range(100, 109) });
    data.issues[1].updated_at = "tomorrow";
    gate(() => m.claim(101, () => data), "Revalidate selected issue");
  });

  test("board status blocks dispatch and order is enforced", () => {
    const data = snapshot();
    ready(data);
    gate(() => m.claim(101, () => data));
    data.board[0].status = "Blocked";
    gate(() => m.claim(100, () => data));
  });

  test("human, design, dependency and epic labels block autonomous work", () => {
    const data = snapshot();
    ready(data);
    for (const label of ["hitl", "needs:design", "dep:blocked", "type:epic"]) {
      data.issues[0].labels = [{ name: label }];
      gate(() => m.claim(100, () => data));
    }
    expect(m.status().occupied).toBe(0);
  });

  test("changed board order invalidates dispatch", () => {
    const data = snapshot();
    ready(data);
    data.board[0].order = 99;
    gate(() => m.claim(100, () => data));
  });

  test("another worker may claim next independent issue", () => {
    const data = snapshot();
    ready(data);
    m.claim(100, () => data);
    m.claim(101, () => data);
    expect(m.status().occupied).toBe(2);
  });

  test("bind converts reservation to PR without double counting", () => {
    const data = snapshot();
    ready(data);
    m.claim(100, () => data);
    m.bind(100, 100, () => snapshot({ prs: [pr(100)] }));
    expect(m.status().occupied).toBe(1);
    m.claim(101, () => snapshot({ prs: [pr(100)] }));
    expect(m.status().occupied).toBe(2);
  });

  test("fork branch cannot recover or bind local reservation", () => {
    const data = snapshot();
    ready(data);
    m.claim(100, () => data);
    const fork = pr(100);
    fork.head.repo.full_name = "someone/fork";
    m.sync(snapshot({ prs: [fork] }));
    expect(m.status().reservations["100"].pr).toBeNull();
    gate(() => m.bind(100, 100, () => snapshot({ prs: [fork] })));
  });

  test("existing branch PR cannot be reused for new work", () => {
    const old = pr(100, { state: "closed", merged: true });
    old.body = "Refs #100";
    const data = snapshot({ prs: [old] });
    ready(data);
    gate(() => m.claim(100, () => data));
  });

  test("network error fails closed without reservation", () => {
    ready(snapshot());
    expect(() =>
      m.claim(100, () => {
        throw new Error("offline");
      }),
    ).toThrow("offline");
    expect(m.status().occupied).toBe(0);
  });

  test("concurrent claims: only one wins", async () => {
    const data = snapshot({ prs: range(1, 5).map((n) => pr(n)) });
    ready(data);
    const script = `
      import { Manager, GateError } from ${JSON.stringify(join(import.meta.dir, "pm.ts"))};
      const data = ${JSON.stringify(data)};
      try { new Manager(${JSON.stringify(path)}, () => ${MONDAY}).claim(100, () => data); console.log("won"); }
      catch (e) { if (!(e instanceof GateError)) throw e; console.log("lost"); }`;
    const runs = await Promise.all(
      [0, 1].map(async () => {
        const proc = Bun.spawn([process.execPath, "-e", script], {
          stdout: "pipe",
          stderr: "inherit",
        });
        return (await new Response(proc.stdout).text()).trim();
      }),
    );
    expect(runs.sort()).toEqual(["lost", "won"]);
  });

  test("auto dispatch waits for today's go", () => {
    const data = snapshot();
    m.sync(data);
    m.audit(100, "needed", "Evidence", "abc");
    gate(() => m.claim(100, () => data), "plan approved");
    m.planPropose([100]);
    gate(() => m.claim(100, () => data), "plan approved");
    m.planApprove("Telegram update 7: go");
    m.claim(100, () => data);
  });

  test("yesterday's go does not carry over", () => {
    const data = snapshot();
    m.sync(data);
    m.audit(100, "needed", "Evidence", "abc");
    go(100);
    clock[0] += 86400;
    expect(m.status().plan).toBeNull();
    gate(() => m.claim(100, () => data), "plan approved");
  });

  test("a fresh go picks up the last plan when none is dated today", () => {
    const data = snapshot();
    m.sync(data);
    m.audit(100, "needed", "Evidence", "abc");
    m.planPropose([100, 101]);
    clock[0] += 86400;
    expect(m.status().last_plan).toMatchObject({ items: [100, 101] });
    const plan = m.planApprove("Telegram update 9: go");
    expect(plan).toMatchObject({
      date: m.status().today,
      items: [100, 101],
      status: "approved",
      ref: "Telegram update 9: go",
    });
    expect(m.status().last_plan).toBeNull();
    m.claim(100, () => data);
  });

  test("a carried plan drops issues that closed and skips stay skipped", () => {
    m.sync(snapshot());
    m.planPropose([100, 101]);
    clock[0] += 86400;
    m.sync(snapshot({ issues: [101] }));
    expect(m.planApprove("go").items).toEqual([101]);
    m.planSkip();
    clock[0] += 86400;
    gate(() => m.planApprove("go"), "No plan");
  });

  test("status lists PRs without the API payload", () => {
    m.sync(snapshot({ prs: [pr(100)] }));
    expect(m.status().prs).toEqual([
      {
        number: 100,
        title: undefined,
        html_url: "https://github.com/x/y/pull/100",
        state: "open",
        draft: false,
        merged_at: null,
        branch: "codex/issue-100",
        issues: [100],
      },
    ]);
  });

  test("plan items run in order", () => {
    const data = snapshot();
    m.sync(data);
    for (const n of [100, 101]) m.audit(n, "needed", "Evidence", "abc");
    go(101, 100);
    gate(() => m.claim(100, () => data), "not next");
    m.claim(101, () => data);
    m.claim(100, () => data);
  });

  test("skip blocks approval", () => {
    m.planPropose([100]);
    m.planSkip();
    gate(() => m.planApprove("go"), "skipped");
  });

  test("plan is capped at three unless overridden", () => {
    gate(() => m.planPropose([100, 101, 102, 103]), "capped");
    m.planPropose([100, 101, 102]);
    gate(() => m.planAdd(103), "full");
    expect(m.planAdd(103, true).items).toEqual([100, 101, 102, 103]);
  });

  test("weekend starts nothing", () => {
    const data = snapshot();
    ready(data);
    clock[0] = SATURDAY;
    gate(() => m.claim(100, () => data), "Weekend");
    gate(() => m.planPropose([100]), "Weekend");
    expect(m.status().weekend).toBe(true);
  });

  test("task ledger keeps promises until closed", () => {
    const first = m.taskAdd("Look into flaky e2e", "telegram:5");
    m.taskAdd("Rebase PR 700");
    expect(new Manager(path).tasks().map((t: any) => t.id)).toEqual([1, 2]);
    m.taskClose(first.id, "done", "Fixed in #801");
    expect(m.status().open_tasks.map((t: any) => t.id)).toEqual([2]);
    gate(() => m.taskClose(first.id, "dropped"));
  });

  test("state written by the Python manager loads and gains plan/tasks", () => {
    const legacy = new Manager(path);
    const conn = new (require("bun:sqlite").Database)(legacy.db);
    conn.run("UPDATE state SET data=? WHERE id=1", [
      JSON.stringify({
        paused: true,
        approved: null,
        queue: [],
        audits: {},
        reservations: {},
        prs: {},
        snapshot: null,
        synced_at: null,
      }),
    ]);
    conn.close();
    const status = new Manager(path, () => MONDAY).status();
    expect(status.paused).toBe(true);
    expect(status.plan).toBeNull();
    expect(status.open_tasks).toEqual([]);
  });
});
