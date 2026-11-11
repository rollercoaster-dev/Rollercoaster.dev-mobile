#!/usr/bin/env bun
/**
 * Install a versioned local PM runtime plus the Telegram receiver service.
 *
 * macOS: a user LaunchAgent for the receiver.
 * Linux: systemd user units for the receiver and weekday plan/tick/recap timers.
 */
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  renameSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";

export const LABEL = "dev.rollercoaster.project-manager-telegram";
export const RECEIVER_UNIT = "rollercoaster-pm-telegram.service";
export const WAKEUP_UNIT = "rollercoaster-pm@.service";
// Weekdays only, Europe/Berlin. Ticks skip 09:00 (plan) and 18:00 (recap).
export const TIMERS: Record<string, string[]> = {
  plan: ["Mon..Fri *-*-* 09:00:00 Europe/Berlin"],
  tick: [
    "Mon..Fri *-*-* 09:30:00 Europe/Berlin",
    "Mon..Fri *-*-* 10..17:00,30:00 Europe/Berlin",
  ],
  recap: ["Mon..Fri *-*-* 18:00:00 Europe/Berlin"],
};
const LEGACY_UNITS = [
  "rollercoaster-pm-heartbeat.timer",
  "rollercoaster-pm-heartbeat.service",
];

function receiverArgs(
  bun: string,
  link: string,
  state: string,
  home: string,
): string[] {
  return [
    resolve(bun),
    join(link, "scripts/project_manager/telegram_bridge.ts"),
    "--repo-root",
    link,
    "--state-dir",
    state,
    "--env-file",
    join(home, ".config/telegram/env"),
    "run",
  ];
}

function writePrivate(path: string, text: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
  chmodSync(path, 0o600);
}

function run(args: string[], check = true): void {
  const result = spawnSync(args[0], args.slice(1), {
    stdio: check ? "inherit" : "ignore",
  });
  if (check && result.status !== 0)
    throw new Error(`Command failed: ${args.join(" ")}`);
}

const xml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function plist(values: Record<string, unknown>): string {
  const encode = (value: unknown, indent: string): string => {
    if (typeof value === "boolean") return `${indent}<${value}/>`;
    if (typeof value === "number")
      return `${indent}<integer>${value}</integer>`;
    if (Array.isArray(value))
      return `${indent}<array>\n${value.map((v) => encode(v, indent + "\t")).join("\n")}\n${indent}</array>`;
    if (value && typeof value === "object")
      return `${indent}<dict>\n${Object.entries(value)
        .map(
          ([k, v]) =>
            `${indent}\t<key>${xml(k)}</key>\n${encode(v, indent + "\t")}`,
        )
        .join("\n")}\n${indent}</dict>`;
    return `${indent}<string>${xml(String(value))}</string>`;
  };
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n' +
    `<plist version="1.0">\n${encode(values, "")}\n</plist>\n`
  );
}

function installLaunchAgent(
  home: string,
  bun: string,
  link: string,
  state: string,
  start: boolean,
): string {
  const agent = join(home, "Library/LaunchAgents", `${LABEL}.plist`);
  writePrivate(
    agent,
    plist({
      Label: LABEL,
      ProgramArguments: receiverArgs(bun, link, state, home),
      RunAtLoad: true,
      KeepAlive: true,
      ThrottleInterval: 15,
      EnvironmentVariables: {
        PATH: "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin",
        HOME: home,
      },
      StandardOutPath: join(state, "telegram.stdout.log"),
      StandardErrorPath: join(state, "telegram.stderr.log"),
    }),
  );
  if (start) {
    const target = `gui/${process.getuid!()}`;
    run(["launchctl", "bootout", `${target}/${LABEL}`], false);
    run(["launchctl", "bootstrap", target, agent]);
  }
  return agent;
}

function installSystemd(
  home: string,
  bun: string,
  link: string,
  state: string,
  start: boolean,
  pathEnv: string,
): string {
  const units = join(home, ".config/systemd/user");
  const receiver = join(units, RECEIVER_UNIT);
  // systemd does not word-split quoted args the shell way; paths here contain no spaces.
  writePrivate(
    receiver,
    `[Unit]
Description=Rollercoaster.dev project manager Telegram receiver
After=network-online.target
Wants=network-online.target

[Service]
ExecStart=${receiverArgs(bun, link, state, home).join(" ")}
Restart=always
RestartSec=15
Environment=HOME=${home}
Environment=PATH=${pathEnv}
StandardOutput=append:${join(state, "telegram.stdout.log")}
StandardError=append:${join(state, "telegram.stderr.log")}

[Install]
WantedBy=default.target
`,
  );
  writePrivate(
    join(units, WAKEUP_UNIT),
    `[Unit]
Description=Rollercoaster.dev project manager wakeup (%i)
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=${join(link, "scripts/project_manager/heartbeat.sh")} %i
Environment=HOME=${home}
Environment=PATH=${pathEnv}
TimeoutStartSec=4h
StandardOutput=append:${join(state, "heartbeat.log")}
StandardError=append:${join(state, "heartbeat.log")}
`,
  );
  for (const [mode, calendars] of Object.entries(TIMERS)) {
    // Only the morning plan catches up after sleep; a missed tick or recap is just skipped.
    // WakeSystem resumes a suspended machine so the agent runs on schedule.
    writePrivate(
      join(units, `rollercoaster-pm-${mode}.timer`),
      `[Unit]\nDescription=Rollercoaster.dev project manager ${mode}\n\n[Timer]\n` +
        calendars.map((c) => `OnCalendar=${c}`).join("\n") +
        `\nUnit=rollercoaster-pm@${mode}.service\nPersistent=${mode === "plan"}\nWakeSystem=true\n\n[Install]\nWantedBy=timers.target\n`,
    );
  }
  const timers = Object.keys(TIMERS).map(
    (mode) => `rollercoaster-pm-${mode}.timer`,
  );
  if (start) {
    const legacy = LEGACY_UNITS.filter((name) => existsSync(join(units, name)));
    if (legacy.length)
      run(["systemctl", "--user", "disable", "--now", ...legacy], false);
  }
  for (const name of LEGACY_UNITS)
    if (existsSync(join(units, name))) unlinkSync(join(units, name));
  // After ad/bin/install-units switched to the auto-dev port, its listener is
  // the only bot reader: never start the old receiver and timers next to it.
  if (start && existsSync(join(units, "rollercoaster-pm-ad-listen.service"))) {
    run(["systemctl", "--user", "daemon-reload"]);
    run([
      "systemctl",
      "--user",
      "restart",
      "rollercoaster-pm-ad-listen.service",
    ]);
  } else if (start) {
    run(["systemctl", "--user", "daemon-reload"]);
    run(["systemctl", "--user", "enable", RECEIVER_UNIT, ...timers]);
    run(["systemctl", "--user", "restart", RECEIVER_UNIT]);
    run(["systemctl", "--user", "restart", ...timers]);
  }
  return receiver;
}

export interface InstallOptions {
  start?: boolean;
  platform?: string;
  pathEnv?: string;
}

export function install(
  source: string,
  homeDir: string,
  bun: string,
  options: InstallOptions = {},
): [string, string] {
  const { start = false, platform = process.platform } = options;
  source = resolve(source);
  const home = resolve(homeDir.replace(/^~(?=\/|$)/, homedir()));
  const base = join(home, ".local/share/rollercoaster-pm");
  const state = join(home, ".local/state/rollercoaster-pm");
  mkdirSync(base, { recursive: true, mode: 0o700 });
  mkdirSync(state, { recursive: true, mode: 0o700 });
  if (platform !== "linux" && platform !== "darwin")
    throw new Error(`Unsupported platform: ${platform}`);
  const release = mkdtempSync(join(base, "runtime-"));
  for (const relative of [
    "scripts/project_manager",
    ".agents/skills",
    ".claude/agents",
  ])
    cpSync(join(source, relative), join(release, relative), {
      recursive: true,
      filter: (path) =>
        !["__pycache__", "node_modules"].includes(basename(path)),
    });
  const doc = "docs/architecture/project-manager.md";
  mkdirSync(dirname(join(release, doc)), { recursive: true });
  copyFileSync(join(source, doc), join(release, doc));
  const link = join(base, "current");
  const temporary = join(base, `.current-${process.pid}`);
  symlinkSync(basename(release), temporary);
  renameSync(temporary, link);
  const binDir = join(home, ".local/bin");
  mkdirSync(binDir, { recursive: true });
  const command = join(binDir, "rollercoaster-pm");
  if (existsSync(command) && !lstatSync(command).isSymbolicLink())
    throw new Error(`Refusing to replace existing command: ${command}`);
  const commandTmp = join(binDir, `.rollercoaster-pm-${process.pid}`);
  symlinkSync(join(link, "scripts/project_manager/run-manager.sh"), commandTmp);
  renameSync(commandTmp, command);
  const service =
    platform === "linux"
      ? installSystemd(
          home,
          bun,
          link,
          state,
          start,
          options.pathEnv ?? process.env.PATH ?? "/usr/local/bin:/usr/bin:/bin",
        )
      : installLaunchAgent(home, bun, link, state, start);
  return [link, service];
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const value = (flag: string, fallback: string) => {
    const i = args.indexOf(flag);
    return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
  };
  const known = new Set(["--source", "--home", "--bun", "--start"]);
  const unknown = args.filter(
    (a, i) => a.startsWith("--") && !known.has(a) && !known.has(args[i - 1]),
  );
  if (unknown.length) {
    console.error(
      `usage: install.ts [--source DIR] [--home DIR] [--bun PATH] [--start]\nunknown: ${unknown.join(" ")}`,
    );
    process.exit(2);
  }
  const result = install(
    value("--source", resolve(import.meta.dir, "../..")),
    value("--home", homedir()),
    value("--bun", process.execPath),
    { start: args.includes("--start") },
  );
  console.log(result.join("\n"));
}
