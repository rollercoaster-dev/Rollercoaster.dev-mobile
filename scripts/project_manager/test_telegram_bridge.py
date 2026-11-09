import json
import tempfile
import time
from datetime import datetime
from zoneinfo import ZoneInfo
import unittest
from pathlib import Path
from unittest.mock import patch
import telegram_bridge as tb

BERLIN = ZoneInfo('Europe/Berlin')
MONDAY_NOON = datetime(2026, 11, 9, 12, 0, tzinfo=BERLIN).timestamp()


class FakeHTTP:
    def __init__(self):
        self.updates = []
        self.sent = []
        self.fail_send = False
        self.offsets = []

    def call(self, method, payload):
        if method == 'getUpdates':
            self.offsets.append(payload['offset'])
            return self.updates
        if self.fail_send:
            raise tb.BridgeError('delivery failed')
        self.sent.append(payload)
        return {'message_id': len(self.sent)}


def update(uid=1, text='hello', user=42, chat=42, **extra):
    return {'update_id': uid, 'message': {'message_id': uid, 'text': text,
        'chat': {'id': chat, 'type': 'private'},
        'from': {'id': user, 'is_bot': False}, **extra}}


class BridgeTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.http = FakeHTTP()
        self.config = tb.Config('secret', 42, 42)
        self.clock = [MONDAY_NOON]
        self.bridge = self.make_bridge()

    def make_bridge(self):
        bridge = tb.Bridge(self.root / 'state', self.root, self.config, self.http, now=lambda: self.clock[0])
        self.addCleanup(bridge.db.close)
        return bridge

    def test_unauthorized_bot_and_forwarded_updates_never_enter_inbox(self):
        self.http.updates = [update(1, user=7), update(2, chat=7),
            update(3, forward_origin={'type': 'user'}),
            update(4, **{'from': {'id':42,'is_bot':True}})]
        self.bridge.once()
        self.assertEqual(self.bridge.inbox(), [])
        self.assertEqual(self.bridge.offset(), 5)
        self.assertEqual(self.http.sent, [])

    def test_restart_deduplicates_inbound_and_acknowledgement(self):
        self.http.updates = [update(8)]
        self.bridge.once()
        restarted = self.make_bridge()
        restarted.once()
        self.assertEqual(len(restarted.inbox()), 1)
        self.assertEqual(len(self.http.sent), 1)
        self.assertEqual(self.http.offsets, [0, 9])

    def test_failed_reply_stays_durable_and_marks_handled_only_after_send(self):
        self.http.updates = [update()]
        self.bridge.once()
        self.http.fail_send = True
        self.bridge.reply(1, 'done')
        self.bridge.flush()
        self.assertEqual(len(self.bridge.inbox()), 1)
        self.assertEqual(self.bridge.health()['pending_outbox'], 1)
        restarted = self.make_bridge()
        self.http.fail_send = False
        restarted.flush()
        self.assertEqual(restarted.inbox(), [])
        self.assertEqual(self.http.sent[-1]['text'], 'done')
        self.assertNotIn('parse_mode', self.http.sent[-1])

    def test_notification_key_deduplicates(self):
        self.bridge.send('notice', 'same')
        self.bridge.flush()
        self.bridge.send('notice', 'same')
        self.bridge.flush()
        self.assertEqual(len(self.http.sent), 1)

    def test_status_pause_resume_route_to_absolute_pm_script_without_shell(self):
        script = self.root / 'scripts/project_manager/pm.py'
        script.parent.mkdir(parents=True)
        script.write_text('import json,sys\nfrom pathlib import Path\np=Path(sys.argv[2])/"calls"\np.open("a").write(sys.argv[3]+"\\n")\nprint(json.dumps({"mode":sys.argv[3],"counts":{"ready":2},"prs":["https://example/pr/1"],"audit":"ok"}))\n')
        self.http.updates = [update(1, '/status'), update(2, 'pause'), update(3, '/resume')]
        self.bridge.once()
        self.assertEqual((self.root/'state/calls').read_text(), 'status\npause\nresume\n')
        self.assertEqual(self.bridge.inbox(), [])
        self.assertIn('ready', self.http.sent[0]['text'])
        self.assertIn('https://example/pr/1', self.http.sent[0]['text'])

    def test_failed_persistence_does_not_advance_offset(self):
        self.http.updates = [update(12)]
        self.bridge.db.execute("CREATE TRIGGER reject_inbox BEFORE INSERT ON inbox BEGIN SELECT RAISE(ABORT, 'disk error'); END")
        with self.assertRaises(Exception):
            self.bridge.once()
        self.assertEqual(self.bridge.offset(), 0)

    def test_receiver_lock_is_exclusive(self):
        with tb.receiver_lock(self.root):
            with self.assertRaises(tb.BridgeError):
                with tb.receiver_lock(self.root):
                    pass

    def test_credentials_parse_without_execution_and_group_requires_user(self):
        env = self.root/'env'
        env.write_text('export TELEGRAM_BOT_TOKEN="secret"\nTELEGRAM_CHAT_ID=42\n')
        self.assertEqual(tb.load_config(env).user_id, 42)
        env.write_text('TELEGRAM_BOT_TOKEN="secret"\nTELEGRAM_CHAT_ID=-42\n')
        with self.assertRaises(tb.BridgeError): tb.load_config(env)
        env.write_text('TELEGRAM_BOT_TOKEN=$(touch NEVER)\nTELEGRAM_CHAT_ID=42\n')
        with self.assertRaises(tb.BridgeError): tb.load_config(env)

    def test_status_summarizes_manager_counts_without_dumping_pr_bodies(self):
        text = tb.format_status({'mode': 'audit', 'paused': False,
            'queue_approved': False, 'occupied': 2, 'limit': 5,
            'issue_count': 7, 'unaudited': [4, 8], 'audits': {'1': {}},
            'queue': [1, 2], 'reservations': {},
            'prs': [{'number': 12, 'state': 'open', 'html_url': 'https://example/pr/12',
                     'title': 'Fix', 'body': 'PRIVATE BODY'}]})
        self.assertIn('2/5', text)
        self.assertIn('2 remaining', text)
        self.assertIn('https://example/pr/12', text)
        self.assertNotIn('PRIVATE BODY', text)

    def test_status_uses_pending_queue_after_completed_prefix(self):
        text = tb.format_status({'occupied': 2, 'queue': [1, 2, 3, 4, 5],
                                 'pending_queue': [4, 5]})
        self.assertIn('Queue: #4, #5', text)
        self.assertNotIn('#1', text)
        self.assertLessEqual(len(text.splitlines()), tb.MAX_LINES)

    def test_failed_commands_stay_out_of_natural_language_inbox(self):
        self.http.updates = [update(1, '/pause'), update(2, 'next please')]
        self.bridge.once()
        self.assertEqual([row['update_id'] for row in self.bridge.inbox()], [2])
        self.assertIsNotNone(self.bridge.health()['last_poll'])
        self.assertIsNotNone(self.bridge.health()['last_error'])

    def test_failed_resume_retries_before_newer_pause(self):
        script = self.root / 'scripts/project_manager/pm.py'
        script.parent.mkdir(parents=True)
        script.write_text('import json,sys\nfrom pathlib import Path\np=Path(sys.argv[2])\ncommand=sys.argv[3]\nif command=="resume" and not (p/"retry").exists():\n (p/"retry").touch()\n sys.exit(1)\n(p/"mode").write_text(command)\nprint(json.dumps({"mode":command}))\n')
        self.http.updates = [update(1, '/resume'), update(2, '/pause')]
        self.bridge.once()
        self.bridge.once()
        self.assertEqual((self.root / 'state/mode').read_text(), 'pause')
        self.assertEqual(self.bridge.db.execute('SELECT count(*) FROM inbox WHERE handled=0').fetchone()[0], 0)

    def test_http_errors_redact_token_and_attempts_are_bounded(self):
        with patch.object(tb.urllib.request, 'urlopen', side_effect=OSError('secret')) as opener, patch.object(tb.time, 'sleep'):
            with self.assertRaises(tb.BridgeError) as error:
                tb.TelegramHTTP(self.config).call('getUpdates', {'timeout':0})
        self.assertNotIn('secret', str(error.exception))
        self.assertEqual(opener.call_count, 3)


    def fake_pm(self, body):
        script = self.root / 'scripts/project_manager/pm.py'
        script.parent.mkdir(parents=True, exist_ok=True)
        script.write_text('import json,sys\nfrom pathlib import Path\nargs=sys.argv[3:]\n(Path(sys.argv[2])/"calls").open("a").write(" ".join(args)+"\\n")\n' + body)

    def test_plain_words_ignore_case_punctuation_and_slash(self):
        for text, word in (('OFF!', 'pause'), ('/on', 'resume'), ('Go.', 'go'), ('stop', 'stop'), ('Skip', 'skip')):
            self.assertEqual(tb.control_word(text), word)
        self.assertIsNone(tb.control_word('go fix the login screen please'))

    def test_go_approves_todays_plan_with_traceable_reference(self):
        self.fake_pm('print(json.dumps({"items":[101,102],"status":"approved"}))\n')
        self.http.updates = [update(5, 'go')]
        self.bridge.once()
        self.assertEqual((self.root / 'state/calls').read_text(), 'plan-approve --approval-ref Telegram update 5: go\n')
        self.assertIn('#101, #102', self.http.sent[0]['text'])

    def test_gate_refusal_is_answered_not_retried(self):
        self.fake_pm('print(json.dumps({"error":"No plan for today yet"}))\nsys.exit(1)\n')
        self.http.updates = [update(5, 'go')]
        self.bridge.once()
        self.bridge.once()
        self.assertEqual([m['text'] for m in self.http.sent], ['No plan for today yet.'])
        self.assertEqual(self.bridge.db.execute('SELECT count(*) FROM inbox WHERE handled=0').fetchone()[0], 0)

    def test_long_messages_are_refused(self):
        with self.assertRaises(tb.RefusedError): self.bridge.send('\n'.join(['line'] * 6), 'k')
        with self.assertRaises(tb.RefusedError): self.bridge.send('x' * 800, 'k')
        self.bridge.send('\n'.join(['line'] * 5), 'k')

    def test_quiet_hours_and_weekends_refuse_notifications_but_not_replies(self):
        self.http.updates = [update(1, 'hi')]
        self.bridge.once()
        for when in (datetime(2026, 11, 9, 22, 0, tzinfo=BERLIN), datetime(2026, 11, 10, 7, 59, tzinfo=BERLIN),
                     datetime(2026, 11, 14, 12, 0, tzinfo=BERLIN)):
            self.clock[0] = when.timestamp()
            with self.assertRaises(tb.RefusedError): self.bridge.send('ping', 'k')
        self.bridge.reply(1, 'Answer to your message')

    def test_stop_mutes_notifications_and_any_message_unmutes(self):
        self.http.updates = [update(1, 'STOP')]
        self.bridge.once()
        self.assertIn('Muted', self.http.sent[-1]['text'])
        with self.assertRaisesRegex(tb.RefusedError, 'muted'): self.bridge.send('ping', 'k')
        self.http.updates = [update(2, 'ok')]
        self.bridge.once()
        self.bridge.send('ping', 'k')

    def test_one_open_question_at_a_time(self):
        self.bridge.send('Which first?', 'q1', ask=True)
        with self.assertRaisesRegex(tb.RefusedError, 'already open'): self.bridge.send('And this?', 'q2', ask=True)
        self.bridge.send('Plain update', 'n1')
        self.http.updates = [update(1, '#101')]
        self.bridge.once()
        self.bridge.send('And this?', 'q2', ask=True)

    def test_free_text_starts_listener_and_falls_back_honestly(self):
        script = self.root / 'scripts/project_manager/listen.sh'
        script.parent.mkdir(parents=True, exist_ok=True)
        script.write_text('#!/bin/sh\necho "$1" > "$(dirname "$0")/heard"\n')
        script.chmod(0o755)
        self.http.updates = [update(3, 'what is next?')]
        self.bridge.once()
        self.bridge.listener[0].wait(5)
        self.assertEqual((script.parent / 'heard').read_text().strip(), '3')
        self.http.updates = []
        self.bridge.once()
        self.assertIn("Couldn't answer", self.http.sent[-1]['text'])
        self.assertEqual([r['update_id'] for r in self.bridge.inbox()], [3])
        self.bridge.once()
        self.assertEqual(len(self.http.sent), 1)


if __name__ == '__main__': unittest.main()
