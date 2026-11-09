#!/usr/bin/env python3
"""Install a versioned local PM runtime plus the Telegram receiver service.

macOS: a user LaunchAgent for the receiver.
Linux: systemd user units for the receiver and weekday plan/tick/recap timers.
"""
import argparse
import os
from pathlib import Path
import plistlib
import shutil
import subprocess
import sys
import tempfile

LABEL = 'dev.rollercoaster.project-manager-telegram'
RECEIVER_UNIT = 'rollercoaster-pm-telegram.service'
WAKEUP_UNIT = 'rollercoaster-pm@.service'
# Weekdays only, Europe/Berlin. Ticks skip 09:00 (plan) and 18:00 (recap).
TIMERS = {
    'plan': ('Mon..Fri *-*-* 09:00:00 Europe/Berlin',),
    'tick': ('Mon..Fri *-*-* 09:30:00 Europe/Berlin', 'Mon..Fri *-*-* 10..17:00,30:00 Europe/Berlin'),
    'recap': ('Mon..Fri *-*-* 18:00:00 Europe/Berlin',),
}
LEGACY_UNITS = ('rollercoaster-pm-heartbeat.timer', 'rollercoaster-pm-heartbeat.service')


def _receiver_args(python, link, state, home):
    return [str(Path(python).resolve()), str(link / 'scripts/project_manager/telegram_bridge.py'),
            '--repo-root', str(link), '--state-dir', str(state),
            '--env-file', str(home / '.config/telegram/env'), 'run']


def _write_private(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text)
    path.chmod(0o600)


def _install_launchagent(home, python, link, state, start):
    agent = home / 'Library/LaunchAgents' / f'{LABEL}.plist'
    agent.parent.mkdir(parents=True, exist_ok=True)
    values = dict(Label=LABEL, ProgramArguments=_receiver_args(python, link, state, home),
        RunAtLoad=True, KeepAlive=True, ThrottleInterval=15,
        EnvironmentVariables={'PATH': '/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin', 'HOME': str(home)},
        StandardOutPath=str(state / 'telegram.stdout.log'), StandardErrorPath=str(state / 'telegram.stderr.log'))
    with agent.open('wb') as stream: plistlib.dump(values, stream)
    agent.chmod(0o600)
    if start:
        target = f'gui/{os.getuid()}'
        subprocess.run(['launchctl', 'bootout', target + '/' + LABEL], capture_output=True, check=False)
        subprocess.run(['launchctl', 'bootstrap', target, str(agent)], check=True)
    return agent


def _install_systemd(home, python, link, state, start, path_env):
    units = home / '.config/systemd/user'
    receiver = units / RECEIVER_UNIT
    # systemd does not word-split quoted args the shell way; paths here contain no spaces.
    exec_start = ' '.join(_receiver_args(python, link, state, home))
    _write_private(receiver, f"""[Unit]
Description=Rollercoaster.dev project manager Telegram receiver
After=network-online.target
Wants=network-online.target

[Service]
ExecStart={exec_start}
Restart=always
RestartSec=15
Environment=HOME={home}
Environment=PATH={path_env}
StandardOutput=append:{state / 'telegram.stdout.log'}
StandardError=append:{state / 'telegram.stderr.log'}

[Install]
WantedBy=default.target
""")
    _write_private(units / WAKEUP_UNIT, f"""[Unit]
Description=Rollercoaster.dev project manager wakeup (%i)
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
ExecStart={link / 'scripts/project_manager/heartbeat.sh'} %i
Environment=HOME={home}
Environment=PATH={path_env}
TimeoutStartSec=4h
StandardOutput=append:{state / 'heartbeat.log'}
StandardError=append:{state / 'heartbeat.log'}
""")
    for mode, calendars in TIMERS.items():
        # Only the morning plan catches up after sleep; a missed tick or recap is just skipped.
        _write_private(units / f'rollercoaster-pm-{mode}.timer', '[Unit]\nDescription=Rollercoaster.dev project manager {}\n\n[Timer]\n{}\nUnit=rollercoaster-pm@{}.service\nPersistent={}\n\n[Install]\nWantedBy=timers.target\n'.format(
            mode, '\n'.join('OnCalendar=' + c for c in calendars), mode, 'true' if mode == 'plan' else 'false'))
    timers = [f'rollercoaster-pm-{mode}.timer' for mode in TIMERS]
    if start:
        legacy = [name for name in LEGACY_UNITS if (units / name).exists()]
        if legacy:
            subprocess.run(['systemctl', '--user', 'disable', '--now', *legacy], check=False)
    for name in LEGACY_UNITS:
        (units / name).unlink(missing_ok=True)
    if start:
        subprocess.run(['systemctl', '--user', 'daemon-reload'], check=True)
        subprocess.run(['systemctl', '--user', 'enable', RECEIVER_UNIT, *timers], check=True)
        subprocess.run(['systemctl', '--user', 'restart', RECEIVER_UNIT], check=True)
        subprocess.run(['systemctl', '--user', 'restart', *timers], check=True)
    return receiver


def install(source, home, python, start=False, platform=sys.platform, path_env=None):
    source, home = Path(source).resolve(), Path(home).expanduser().resolve()
    base = home / '.local/share/rollercoaster-pm'
    state = home / '.local/state/rollercoaster-pm'
    base.mkdir(parents=True, exist_ok=True, mode=0o700)
    state.mkdir(parents=True, exist_ok=True, mode=0o700)
    release = Path(tempfile.mkdtemp(prefix='runtime-', dir=base))
    for relative in ('scripts/project_manager', '.agents/skills', '.claude/agents'):
        shutil.copytree(source / relative, release / relative, ignore=shutil.ignore_patterns('__pycache__'))
    doc = Path('docs/architecture/project-manager.md')
    (release / doc).parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source / doc, release / doc)
    link = base / 'current'
    temporary = base / f'.current-{os.getpid()}'
    temporary.symlink_to(release.name)
    temporary.replace(link)
    bin_dir = home / '.local/bin'
    bin_dir.mkdir(parents=True, exist_ok=True)
    command = bin_dir / 'rollercoaster-pm'
    if command.exists() and not command.is_symlink():
        raise RuntimeError(f'Refusing to replace existing command: {command}')
    command_tmp = bin_dir / f'.rollercoaster-pm-{os.getpid()}'
    command_tmp.symlink_to(link / 'scripts/project_manager/run-manager.sh')
    command_tmp.replace(command)
    if platform.startswith('linux'):
        service = _install_systemd(home, python, link, state, start,
                                   path_env or os.environ.get('PATH', '/usr/local/bin:/usr/bin:/bin'))
    elif platform == 'darwin':
        service = _install_launchagent(home, python, link, state, start)
    else:
        raise RuntimeError(f'Unsupported platform: {platform}')
    return str(link), str(service)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, default=Path(__file__).resolve().parents[2])
    parser.add_argument('--home', type=Path, default=Path.home())
    parser.add_argument('--python', default=sys.executable)
    parser.add_argument('--start', action='store_true')
    args = parser.parse_args()
    print('\n'.join(install(args.source, args.home, args.python, args.start)))
