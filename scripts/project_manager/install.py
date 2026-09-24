#!/usr/bin/env python3
"""Install a versioned local PM runtime and optional macOS Telegram receiver."""
import argparse
import os
from pathlib import Path
import plistlib
import shutil
import subprocess
import sys
import tempfile

LABEL = 'dev.rollercoaster.project-manager-telegram'


def install(source, home, python, start=False):
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
    agent = home / 'Library/LaunchAgents' / f'{LABEL}.plist'
    agent.parent.mkdir(parents=True, exist_ok=True)
    values = dict(Label=LABEL, ProgramArguments=[str(Path(python).resolve()),
        str(link / 'scripts/project_manager/telegram_bridge.py'), '--repo-root', str(link),
        '--state-dir', str(state), '--env-file', str(home / '.config/telegram/env'), 'run'],
        RunAtLoad=True, KeepAlive=True, ThrottleInterval=15,
        EnvironmentVariables={'PATH': '/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin', 'HOME': str(home)},
        StandardOutPath=str(state / 'telegram.stdout.log'), StandardErrorPath=str(state / 'telegram.stderr.log'))
    with agent.open('wb') as stream: plistlib.dump(values, stream)
    agent.chmod(0o600)
    if start:
        target = f'gui/{os.getuid()}'
        subprocess.run(['launchctl', 'bootout', target + '/' + LABEL], capture_output=True, check=False)
        subprocess.run(['launchctl', 'bootstrap', target, str(agent)], check=True)
    return str(link), str(agent)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, default=Path(__file__).resolve().parents[2])
    parser.add_argument('--home', type=Path, default=Path.home())
    parser.add_argument('--python', default=sys.executable)
    parser.add_argument('--start', action='store_true')
    args = parser.parse_args()
    print('\n'.join(install(args.source, args.home, args.python, args.start)))
