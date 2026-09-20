import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import telegram_bridge as tb


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
        self.bridge = self.make_bridge()

    def make_bridge(self):
        bridge = tb.Bridge(self.root / 'state', self.root, self.config, self.http)
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
        self.assertIn('Next queue issues: #4, #5', text)
        self.assertNotIn('Next queue issues: #1', text)

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


if __name__ == '__main__': unittest.main()
