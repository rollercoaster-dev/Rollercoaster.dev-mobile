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
from datetime import datetime
from zoneinfo import ZoneInfo


class BridgeError(Exception):
    pass


class RefusedError(BridgeError):
    """A deliberate no: too long, quiet hours, weekend, muted, or a question already open."""


BERLIN = ZoneInfo('Europe/Berlin')
MAX_LINES = 5
MAX_CHARS = 700
MUTE_SECONDS = 30 * 60
# Plain words, case and punctuation ignored: "OFF!" == off.
CONTROLS = {'status': 'status', 'pause': 'pause', 'off': 'pause', 'resume': 'resume', 'on': 'resume',
            'help': 'help', 'stop': 'stop', 'go': 'go', 'skip': 'skip', 'tasks': 'tasks'}
HELP = ('go / skip: today\'s plan\n'
        'status, tasks: where things stand\n'
        'stop: mute 30 min (work continues)\n'
        'off / on: pause or resume work\n'
        'Anything else: I answer in about a minute.')


def control_word(text):
    word = re.sub(r'[^a-z]', '', text.lower())
    return CONTROLS.get(word) if len(text) <= 20 else None


def check_length(text):
    if len(text.strip().splitlines()) > MAX_LINES or len(text) > MAX_CHARS:
        raise RefusedError(f'Too long: max {MAX_LINES} lines / {MAX_CHARS} characters. Cut it down.')


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
    """At most five short lines: the picture, never a dump."""
    if 'occupied' not in data:
        lines = ['{}: {}'.format(key.replace('_', ' '), json.dumps(value, ensure_ascii=False) if isinstance(value, (dict, list)) else value)
                 for key, value in data.items()]
        return '\n'.join(lines[:MAX_LINES])
    plan = data.get('plan')
    if data.get('pending_queue'):
        today = 'Queue: ' + ', '.join('#' + str(n) for n in data['pending_queue'][:3])
    elif plan:
        label = {'approved': 'go given', 'proposed': 'waiting for your go', 'skipped': 'skipped'}.get(plan['status'], plan['status'])
        today = 'Plan: {} ({})'.format(' '.join('#' + str(n) for n in plan['items']), label)
    else:
        today = 'Plan: none yet'
    state = 'Off' if data.get('paused') else 'On'
    if data.get('weekend'):
        state += ', weekend'
    active = [key for key, item in data.get('reservations', {}).items() if item.get('pr') is None]
    prs = [item for item in data.get('prs', []) if item.get('state', '').lower() == 'open']
    synced = data.get('synced_at')
    age = '{} min ago'.format(max(0, int((time.time() - synced) / 60))) if synced else 'never'
    lines = ['{}. {}'.format(state, today),
             'Working on: ' + (', '.join('#' + key for key in active[:3]) or 'nothing'),
             'Open PRs: ' + (' '.join(item.get('html_url') or item.get('url') or '#' + str(item.get('number')) for item in prs[:3]) or 'none'),
             'Open tasks: {}'.format(len(data.get('open_tasks', []))),
             'Slots {}/{} · audit {} remaining · synced {}'.format(
                 data.get('occupied', 0), data.get('limit', 5), len(data.get('unaudited', [])), age)]
    return '\n'.join(lines)


class Bridge:
    def __init__(self, state_dir, repo_root, config, http=None, now=time.time):
        self.now = now
        self.listener = None
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
            CREATE TABLE IF NOT EXISTS listened (update_id INTEGER PRIMARY KEY, started_at REAL NOT NULL);
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

    def _meta(self, key, default=None):
        row = self.db.execute('SELECT value FROM metadata WHERE key=?', (key,)).fetchone()
        return row[0] if row else default

    def _berlin(self):
        return datetime.fromtimestamp(self.now(), BERLIN)

    def send(self, text, key=None, ask=False):
        """A notification Joe didn't ask for. Refused when it would interrupt rest."""
        check_length(text)
        now = self._berlin()
        if now.weekday() >= 5:
            raise RefusedError('Weekend: no notifications. Hold it for Monday.')
        if now.hour >= 21 or now.hour < 8:
            raise RefusedError('Quiet hours (21:00-08:00): hold it for the morning.')
        if float(self._meta('muted_until', '0')) > self.now():
            raise RefusedError('Joe muted the bot; send nothing.')
        if ask and self._meta('open_ask_date') == now.date().isoformat():
            raise RefusedError('A question is already open; wait for the answer.')
        with self.db:
            self._enqueue(text, 'notification:' + (key or str(uuid.uuid4())))
            if ask:
                self.db.execute("INSERT OR REPLACE INTO metadata VALUES ('open_ask_date', ?)", (now.date().isoformat(),))

    def reply(self, update_id, text):
        check_length(text)
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

    def _pm(self, *args):
        return subprocess.run([sys.executable, str(self.repo_root / 'scripts/project_manager/pm.py'),
                               '--state-dir', str(self.state_dir), *args],
                              capture_output=True, text=True, timeout=60)

    def _answer(self, row):
        command = row['command']
        if command == 'help':
            return HELP
        if command == 'stop':
            self._record('muted_until', self.now() + MUTE_SECONDS)
            self._stop_listener()
            return 'Muted for 30 min. Work continues. Any message unmutes.'
        args = {'go': ('plan-approve', '--approval-ref', 'Telegram update {}: go'.format(row['update_id'])),
                'skip': ('plan-skip',)}.get(command, (command,))
        result = self._pm(*args)
        data = json.loads(result.stdout)
        if result.returncode != 0:
            if isinstance(data, dict) and data.get('error'):
                return data['error'] + '.'  # A gate said no: answer it, don't retry.
            raise ValueError()
        if command == 'status':
            return format_status(data)
        if command == 'pause':
            return 'Off. No new work until you say on.'
        if command == 'resume':
            return 'On.'
        if command == 'go':
            return 'Go: {}. Starts at the next work tick (within 30 min).'.format(
                ', '.join('#' + str(n) for n in data.get('items', [])))
        if command == 'skip':
            return 'Skipped today. Nothing starts.'
        if command == 'tasks':
            if not data:
                return 'No open tasks.'
            return '\n'.join('{}. {}'.format(t['id'], t['text'][:80]) for t in data[:MAX_LINES])
        return format_status(data)

    def _commands(self):
        for row in self.db.execute('SELECT * FROM inbox WHERE handled=0 AND command IS NOT NULL ORDER BY update_id').fetchall():
            if self.db.execute('SELECT 1 FROM outbox WHERE update_id=?', (row['update_id'],)).fetchone():
                continue
            try:
                answer = self._answer(row)
            except (OSError, subprocess.SubprocessError, ValueError, AttributeError, TypeError):
                self._record('last_error', 'Project manager command failed; saved for retry.')
                # Keep the command unhandled and retry on the next poll.
                with self.db:
                    self._enqueue('That command could not run. Saved; retrying.', 'command-error:' + str(row['update_id']))
                # Preserve user intent ordering: do not let a later pause or
                # resume execute before this older command can be retried.
                break
            self.reply(row['update_id'], answer)

    # --- Listener: an instant, read-only answer to free text ---

    def _stop_listener(self):
        if self.listener and self.listener[0].poll() is None:
            self.listener[0].terminate()

    def _listen(self):
        if self.listener:
            process, uid = self.listener
            if process.poll() is None:
                return
            self.listener = None
            if not self.db.execute('SELECT 1 FROM outbox WHERE update_id=?', (uid,)).fetchone():
                with self.db:  # Honest fallback; the message stays in the inbox for the next tick.
                    self._enqueue("Couldn't answer that one right now. Saved for the next work tick.", 'listen-fail:' + str(uid))
        row = self.db.execute('SELECT update_id FROM inbox WHERE handled=0 AND command IS NULL AND update_id NOT IN '
                              '(SELECT update_id FROM listened) ORDER BY update_id LIMIT 1').fetchone()
        if not row:
            return
        uid = row['update_id']
        with self.db:
            self.db.execute('INSERT INTO listened VALUES (?, ?)', (uid, self.now()))
        script = self.repo_root / 'scripts/project_manager/listen.sh'
        try:
            if not script.is_file():
                raise OSError()
            log = open(self.state_dir / 'listen.log', 'a')
            self.listener = (subprocess.Popen([str(script), str(uid)], stdout=log, stderr=log,
                                              stdin=subprocess.DEVNULL, start_new_session=True), uid)
            log.close()
        except OSError:
            with self.db:
                self._enqueue('Saved. No instant answer available; the next work tick picks it up.', 'ack:' + str(uid))

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
                    command = control_word(text)
                    inserted = self.db.execute('INSERT OR IGNORE INTO inbox (update_id,text,message_id,command,received_at) VALUES (?,?,?,?,?)',
                                               (uid, text, message['message_id'], command, time.time())).rowcount
                    if inserted:
                        # Any message from Joe answers the open question; anything but stop unmutes.
                        self.db.execute("DELETE FROM metadata WHERE key='open_ask_date'")
                        if command != 'stop':
                            self.db.execute("DELETE FROM metadata WHERE key='muted_until'")
                self.db.execute("UPDATE metadata SET value=? WHERE key='offset'", (str(uid + 1),))
        self._commands()
        self._listen()
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
    send.add_argument('--ask', action='store_true', help='This message asks Joe a question (one open at a time).')
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
                bridge.send(args.text, args.key, args.ask)
            else:
                bridge.reply(args.update_id, args.text)
            bridge.flush()
            print(json.dumps(bridge.health()))
        return 0
    except RefusedError as refused:
        print(json.dumps({'refused': str(refused)}))
        return 3
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
