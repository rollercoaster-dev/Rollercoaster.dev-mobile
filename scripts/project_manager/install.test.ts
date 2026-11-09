import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  lstatSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { install, WAKEUP_UNIT } from "./install";

const SOURCE = resolve(import.meta.dir, "../..");

describe("install", () => {
  let home: string;
  beforeEach(() => (home = mkdtempSync(join(tmpdir(), "pm-install-"))));
  afterEach(() => rmSync(home, { recursive: true, force: true }));

  const upgrade = (platform: string) => {
    let [link] = install(SOURCE, home, "/usr/bin/bun", {
      platform,
      pathEnv: "/usr/bin:/bin",
    });
    const old = realpathSync(link);
    const state = join(home, ".local/state/rollercoaster-pm");
    writeFileSync(join(state, "existing-state"), "keep");
    const [newLink, service] = install(SOURCE, home, "/usr/bin/bun", {
      platform,
      pathEnv: "/usr/bin:/bin",
    });
    link = newLink;
    expect(realpathSync(link)).not.toBe(old);
    expect(readFileSync(join(state, "existing-state"), "utf8")).toBe("keep");
    expect(existsSync(join(link, "scripts/project_manager/pm.ts"))).toBe(true);
    const command = join(home, ".local/bin/rollercoaster-pm");
    expect(lstatSync(command).isSymbolicLink()).toBe(true);
    expect(realpathSync(command)).toBe(
      realpathSync(join(link, "scripts/project_manager/run-manager.sh")),
    );
    return { link, service };
  };

  test("macOS upgrade preserves state and points agent at installed runtime", () => {
    const { link, service } = upgrade("darwin");
    const plist = readFileSync(service, "utf8");
    const args = [...plist.matchAll(/<string>([^<]*)<\/string>/g)].map(
      (m) => m[1],
    );
    expect(args).toContain(
      join(link, "scripts/project_manager/telegram_bridge.ts"),
    );
    expect(plist).not.toContain(SOURCE + "/scripts");
    expect(plist).toMatch(/<key>KeepAlive<\/key>\s*<true\/>/);
  });

  test("Linux upgrade writes systemd units pointing at installed runtime", () => {
    const { link, service } = upgrade("linux");
    const units = join(home, ".config/systemd/user");
    const text = readFileSync(service, "utf8");
    expect(text).toContain(
      `ExecStart=/usr/bin/bun ${join(link, "scripts/project_manager/telegram_bridge.ts")} `,
    );
    expect(text).toContain("Restart=always");
    expect(text).not.toContain(SOURCE + "/scripts");
    const wakeup = readFileSync(join(units, WAKEUP_UNIT), "utf8");
    expect(wakeup).toContain(
      `ExecStart=${join(link, "scripts/project_manager/heartbeat.sh")} %i`,
    );
    const plan = readFileSync(
      join(units, "rollercoaster-pm-plan.timer"),
      "utf8",
    );
    expect(plan).toContain("OnCalendar=Mon..Fri *-*-* 09:00:00 Europe/Berlin");
    expect(plan).toContain("Unit=rollercoaster-pm@plan.service");
    expect(plan).toContain("Persistent=true");
    expect(plan).toContain("WakeSystem=true");
    const tick = readFileSync(
      join(units, "rollercoaster-pm-tick.timer"),
      "utf8",
    );
    expect(tick).toContain("Persistent=false");
    expect(tick).toContain("WakeSystem=true");
    expect(
      tick
        .split("\n")
        .filter((l) => l.startsWith("OnCalendar"))
        .every((l) => l.includes("Mon..Fri")),
    ).toBe(true);
    expect(
      readFileSync(join(units, "rollercoaster-pm-recap.timer"), "utf8"),
    ).toContain("OnCalendar=Mon..Fri *-*-* 18:00:00");
    expect(existsSync(join(units, "rollercoaster-pm-heartbeat.timer"))).toBe(
      false,
    );
    expect(existsSync(join(home, "Library"))).toBe(false);
  });

  test("legacy heartbeat units are removed", () => {
    const units = join(home, ".config/systemd/user");
    install(SOURCE, home, "/usr/bin/bun", {
      platform: "linux",
      pathEnv: "/usr/bin",
    });
    writeFileSync(join(units, "rollercoaster-pm-heartbeat.timer"), "[Timer]\n");
    install(SOURCE, home, "/usr/bin/bun", {
      platform: "linux",
      pathEnv: "/usr/bin",
    });
    expect(existsSync(join(units, "rollercoaster-pm-heartbeat.timer"))).toBe(
      false,
    );
  });

  test("unsupported platform is refused", () => {
    expect(() =>
      install(SOURCE, home, "/usr/bin/bun", { platform: "win32" }),
    ).toThrow("Unsupported platform");
  });
});
