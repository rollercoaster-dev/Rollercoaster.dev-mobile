#!/usr/bin/env python3
"""Durable, allowlisted Telegram transport for the local project manager.

Delivery is at least once: Telegram cannot deduplicate a send after a lost HTTP
response. Local keys prevent deliberate duplicate notification enqueueing.
"""
import argparse
from contextlib import contextmanager
from dataclasses import dataclass
import fcntl
import json
import os
from pathlib import Path
import re
import shlex
import sqlite3
import subprocess
import sys
import time
import urllib.request
import uuid


class BridgeError(Exception):
    pass


@dataclass(frozen=True)
class Config:
    token: str
    chat_id: int
    user_id: int


def load_config(path):
    values = {}
    try:
        for line in Path(path).expanduser().read_text().splitlines():
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            match = re.fullmatch(r'(?:export\s+)?([A-Z_]+)\s*=\s*(.*)', line)
            if not match:
                raise ValueError()
            key, raw = match.groups()
            if '$' in raw or '`' in raw:
                raise ValueError()
            parts = shlex.split(raw, comments=True)
            if len(parts) != 1:
                raise ValueError()
            values[key] = parts[0]
        token = values['TELEGRAM_BOT_TOKEN']
        chat = int(values['TELEGRAM_CHAT_ID'])
        user = int(values.get('TELEGRAM_USER_ID', str(chat)))
        if not token or any(c.isspace() for c in token) or '/' in token or chat == 0 or user <= 0:
            raise ValueError()
        return Config(token, chat, user)
    except (OSError, ValueError, KeyError):
        raise BridgeError('Invalid Telegram configuration; configure bot token, chat ID and a positive user ID (required for groups).') from None


@contextmanager
def receiver_lock(state_dir, filename='telegram.receiver.lock'):
    path = Path(state_dir)
    path.mkdir(parents=True, exist_ok=True, mode=0o700)
    with (path / filename).open('a') as handle:
        try:
            fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise BridgeError('Telegram lock is already held.') from None
        try:
            yield
        finally:
            fcntl.flock(handle, fcntl.LOCK_UN)


class TelegramHTTP:
    def __init__(self, config):
        self.config = config

    def call(self, method, payload):
        for attempt in range(3):
            try:
                request = urllib.request.Request(
                    'https://api.telegram.org/bot' + self.config.token + '/' + method,
                    data=json.dumps(payload).encode(), headers={'Content-Type': 'application/json'})
                with urllib.request.urlopen(request, timeout=35) as response:
                    data = json.load(response)
                if not isinstance(data, dict) or not data.get('ok'):
                    raise ValueError()
                return data['result']
            except (OSError, ValueError, KeyError):
                if attempt < 2:
                    time.sleep(2 ** attempt)
        raise BridgeError('Telegram request failed after three attempts; delivery remains queued.') from None


def format_status(data):
    if 'occupied' not in data:
        return 'Project manager\n' + '\n'.join(
            '{}: {}'.format(key.replace('_', ' '), json.dumps(value, ensure_ascii=False) if isinstance(value, (dict, list)) else value)
            for key, value in data.items())
    synced = data.get('synced_at')
    age = '{} seconds ago'.format(max(0, int(time.time() - synced))) if synced else 'never refreshed'
    remaining = len(data.get('unaudited', []))
    lines = ['Project manager: {}{}'.format(data.get('mode', 'unknown'), ' (dispatch paused)' if data.get('paused') else ''),
             'Slots: {}/{}'.format(data.get('occupied', 0), data.get('limit', 5)),
             'Issues: {}. Audit: {} assessed, {} remaining.'.format(data.get('issue_count', 0), len(data.get('audits', {})), remaining),
             'Priorities: {}'.format('approved' if data.get('queue_approved') else 'awaiting approval'),
             'Next queue issues: ' + (', '.join('#' + str(n) for n in data.get('pending_queue', data.get('queue', []))[:3]) or 'none'),
             'Snapshot: {} (the heartbeat refreshes it).'.format(age)]
    active = [key for key, item in data.get('reservations', {}).items() if item.get('pr') is None]
    lines.append('Active implementations: ' + (', '.join('#' + key for key in active[:5]) or 'none'))
    prs = [item for item in data.get('prs', []) if item.get('state', '').lower() == 'open']
    lines.append('Open PRs: {}'.format(len(prs)))
    for pr in prs[:5]:
        lines.append('#{} {}'.format(pr.get('number'), pr.get('html_url') or pr.get('url') or ''))
    return '\n'.join(lines)


class Bridge:
    def __init__(self, state_dir, repo_root, config, http=None):
        self.state_dir = Path(state_dir).expanduser().resolve()
        self.repo_root = Path(repo_root).expanduser().resolve()
        self.config = config
        self.http = http or TelegramHTTP(config)
        self.state_dir.mkdir(parents=True, exist_ok=True, mode=0o700)
        self.db = sqlite3.connect(str(self.state_dir / 'telegram.sqlite3'), timeout=10)
        self.db.row_factory = sqlite3.Row
        self.db.execute('PRAGMA journal_mode=WAL')
        self.db.execute('PRAGMA synchronous=FULL')
        self.db.executescript('''
            CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
            INSERT OR IGNORE INTO metadata VALUES ('offset', '0');
            CREATE TABLE IF NOT EXISTS inbox (
                update_id INTEGER PRIMARY KEY, text TEXT NOT NULL, message_id INTEGER NOT NULL,
                command TEXT, handled INTEGER NOT NULL DEFAULT 0, received_at REAL NOT NULL);
            CREATE TABLE IF NOT EXISTS outbox (
                id INTEGER PRIMARY KEY, dedup_key TEXT NOT NULL UNIQUE, text TEXT NOT NULL,
                update_id INTEGER, sent INTEGER NOT NULL DEFAULT 0, created_at REAL NOT NULL);
        ''')

    def offset(self):
        return int(self.db.execute("SELECT value FROM metadata WHERE key='offset'").fetchone()[0])

    def inbox(self):
        return [dict(row) for row in self.db.execute('SELECT * FROM inbox WHERE handled=0 AND command IS NULL ORDER BY update_id')]

    def _record(self, key, value):
        with self.db:
            self.db.execute('INSERT OR REPLACE INTO metadata (key,value) VALUES (?,?)', (key, str(value)))

    def health(self):
        metadata = dict(self.db.execute('SELECT key,value FROM metadata'))
        return {'offset': self.offset(), 'last_poll': float(metadata['last_poll']) if metadata.get('last_poll') else None,
                'last_error': metadata.get('last_error') or None,
                'unhandled_inbox': self.db.execute('SELECT count(*) FROM inbox WHERE handled=0').fetchone()[0],
                'pending_outbox': self.db.execute('SELECT count(*) FROM outbox WHERE sent=0').fetchone()[0]}

    def _enqueue(self, text, key, update_id=None):
        if not isinstance(text, str) or not text.strip():
            raise BridgeError('Message text must not be empty.')
        # Conservative size leaves room for astral Unicode characters (UTF-16).
        chunks = [text[i:i + 1900] for i in range(0, len(text), 1900)]
        for index, chunk in enumerate(chunks):
            self.db.execute('INSERT OR IGNORE INTO outbox (dedup_key,text,update_id,created_at) VALUES (?,?,?,?)',
                            (key + ':' + str(index), chunk, update_id, time.time()))

    def send(self, text, key=None):
        with self.db:
            self._enqueue(text, 'notification:' + (key or str(uuid.uuid4())))

    def reply(self, update_id, text):
        with self.db:
            if not self.db.execute('SELECT 1 FROM inbox WHERE update_id=?', (update_id,)).fetchone():
                raise BridgeError('Unknown inbox update ID.')
            self._enqueue(text, 'reply:' + str(update_id), update_id)

    def flush(self):
        try:
            with receiver_lock(self.state_dir, 'telegram.delivery.lock'):
                for row in self.db.execute('SELECT * FROM outbox WHERE sent=0 ORDER BY id LIMIT 100').fetchall():
                    try:
                        self.http.call('sendMessage', {'chat_id': self.config.chat_id, 'text': row['text']})
                    except BridgeError:
                        self._record('last_error', 'Telegram delivery failed; response retained in outbox.')
                        break
                    with self.db:
                        self.db.execute('UPDATE outbox SET sent=1 WHERE id=?', (row['id'],))
                        if row['update_id'] is not None:
                            self.db.execute('UPDATE inbox SET handled=1 WHERE update_id=? AND NOT EXISTS '
                                            '(SELECT 1 FROM outbox WHERE update_id=? AND sent=0)',
                                            (row['update_id'], row['update_id']))
        except BridgeError:
            # Another local process is delivering the same durable queue.
            pass

    def _authorized(self, message):
        sender = message.get('from', {})
        return (message.get('chat', {}).get('id') == self.config.chat_id
                and sender.get('id') == self.config.user_id and sender.get('is_bot') is False
                and not message.get('sender_chat')
                and not any(key.startswith('forward_') for key in message)
                and isinstance(message.get('text'), str))

    def _commands(self):
        for row in self.db.execute('SELECT * FROM inbox WHERE handled=0 AND command IS NOT NULL ORDER BY update_id').fetchall():
            if self.db.execute('SELECT 1 FROM outbox WHERE update_id=?', (row['update_id'],)).fetchone():
                continue
            if row['command'] == 'help':
                answer = 'Commands: /status, /pause, /resume, /help. Pause and resume control dispatch only; resume never approves priorities. Other messages are saved for the project manager.'
            else:
                try:
                    result = subprocess.run([sys.executable, str(self.repo_root / 'scripts/project_manager/pm.py'),
                                             '--state-dir', str(self.state_dir), row['command']],
                                            capture_output=True, text=True, timeout=30, check=True)
                    data = json.loads(result.stdout)
                    answer = format_status(data)
                except (OSError, subprocess.SubprocessError, ValueError, AttributeError):
                    self._record('last_error', 'Project manager command failed; saved for retry.')
                    # Keep the command unhandled and retry on the next poll.
                    with self.db:
                        self._enqueue('The project manager command could not run. It is saved and will be retried.', 'command-error:' + str(row['update_id']))
                    # Preserve user intent ordering: do not let a later pause or
                    # resume execute before this older command can be retried.
                    break
            self.reply(row['update_id'], answer)

    def once(self, timeout=0):
        self._record('last_error', '')
        self._commands()
        self.flush()
        try:
            updates = self.http.call('getUpdates', {'offset': self.offset(), 'timeout': timeout,
                                                   'limit': 100, 'allowed_updates': ['message']})
        except BridgeError:
            self._record('last_error', 'Telegram polling failed.')
            raise
        self._record('last_poll', time.time())
        for update in updates:
            uid = update.get('update_id')
            if not isinstance(uid, int) or uid < self.offset():
                continue
            message = update.get('message', {})
            with self.db:
                if self._authorized(message):
                    text = message['text']
                    command = text.strip().lower().lstrip('/')
                    command = command if command in ('status', 'pause', 'resume', 'help') else None
                    inserted = self.db.execute('INSERT OR IGNORE INTO inbox (update_id,text,message_id,command,received_at) VALUES (?,?,?,?,?)',
                                               (uid, text, message['message_id'], command, time.time())).rowcount
                    if inserted and command is None:
                        self._enqueue('Received and saved for the project manager. I will reply after processing your message.', 'ack:' + str(uid))
                self.db.execute("UPDATE metadata SET value=? WHERE key='offset'", (str(uid + 1),))
        self._commands()
        self.flush()


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--state-dir', default='~/.local/state/rollercoaster-pm')
    parser.add_argument('--repo-root', default=str(Path(__file__).resolve().parents[2]))
    parser.add_argument('--env-file', default='~/.config/telegram/env')
    sub = parser.add_subparsers(dest='command', required=True)
    for name in ('run', 'once', 'inbox', 'health'):
        sub.add_parser(name)
    send = sub.add_parser('send')
    send.add_argument('text')
    send.add_argument('--key')
    reply = sub.add_parser('reply')
    reply.add_argument('update_id', type=int)
    reply.add_argument('text')
    args = parser.parse_args(argv)
    os.umask(0o077)
    bridge = None
    try:
        config = load_config(args.env_file)
        bridge = Bridge(args.state_dir, args.repo_root, config)
        if args.command in ('run', 'once'):
            with receiver_lock(bridge.state_dir):
                if args.command == 'once':
                    bridge.once()
                else:
                    while True:
                        try:
                            bridge.once(timeout=25)
                        except (BridgeError, sqlite3.Error):
                            print('Telegram polling failed; retrying with durable state retained.', file=sys.stderr)
                            time.sleep(5)
        elif args.command == 'inbox':
            print(json.dumps(bridge.inbox(), ensure_ascii=False))
        elif args.command == 'health':
            print(json.dumps(bridge.health()))
        else:
            if args.command == 'send':
                bridge.send(args.text, args.key)
            else:
                bridge.reply(args.update_id, args.text)
            bridge.flush()
            print(json.dumps(bridge.health()))
        return 0
    except (BridgeError, OSError, sqlite3.Error):
        print('Telegram bridge failed; check configuration, state permissions, and receiver lock.', file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        return 0
    finally:
        if bridge:
            bridge.db.close()


if __name__ == '__main__':
    sys.exit(main())
