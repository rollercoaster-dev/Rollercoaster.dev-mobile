import concurrent.futures
import tempfile
import unittest
from pathlib import Path

from pm import Manager, GateError


def pr(n, state='open', author='joeczar', branch=None, merged=False, draft=False):
    return dict(number=n, state=state, user={'login': author}, head={'ref': branch or f'codex/issue-{n}', 'repo': {'full_name': 'rollercoaster-dev/Rollercoaster.dev-mobile'}},
                merged_at='2026-09-20T12:00:00Z' if merged else None, draft=draft,
                body=f'Closes #{n}', html_url=f'https://github.com/x/y/pull/{n}')


def snapshot(prs=(), issues=range(100, 108), head='abc'):
    return dict(prs=list(prs), issues=[dict(number=n, title=f'Issue {n}', updated_at='today', labels=[]) for n in issues],
                head=head, board=[dict(number=n, status='Next', order=i) for i,n in enumerate(issues)])


class ManagerTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.path = Path(self.tmp.name)
        self.m = Manager(self.path)

    def ready(self, data):
        self.m.sync(data)
        for issue in data['issues']:
            self.m.audit(issue['number'], 'needed', 'Current code still lacks acceptance behavior', 'abc')
        self.m.queue([i['number'] for i in data['issues']])
        self.m.approve_queue('User message: approve this exact queue')

    def test_five_prs_block_start_even_if_drafts(self):
        data = snapshot([pr(n, draft=True) for n in range(1, 6)])
        self.ready(data)
        with self.assertRaises(GateError): self.m.claim(100, lambda: data)
        self.assertEqual(self.m.status()['occupied'], 5)

    def test_reservation_counts_and_duplicate_claim_does_not_start_worker_twice(self):
        data = snapshot([pr(n) for n in range(1, 5)])
        self.ready(data)
        self.m.claim(100, lambda: data)
        self.assertEqual(Manager(self.path).status()['occupied'], 5)
        with self.assertRaises(GateError): self.m.claim(100, lambda: data)
        with self.assertRaises(GateError): self.m.claim(101, lambda: data)

    def test_dependencies_and_verified_release_bot_do_not_consume_slots(self):
        data = snapshot([pr(1, author='dependabot[bot]'), pr(2, author='github-actions[bot]', branch='release-please--branches--main')])
        self.ready(data)
        self.m.claim(100, lambda: data)
        self.assertEqual(self.m.status()['occupied'], 1)

    def test_human_dependency_label_or_release_title_does_not_bypass_cap(self):
        data = snapshot([pr(n, branch='release-please--branches--main') for n in range(1,6)])
        self.ready(data)
        with self.assertRaises(GateError): self.m.claim(100, lambda: data)

    def test_closed_without_merge_holds_slot_merge_releases(self):
        data = snapshot([pr(n) for n in range(1,6)])
        self.ready(data)
        closed = snapshot([pr(1, state='closed')] + [pr(n) for n in range(2,6)])
        with self.assertRaises(GateError): self.m.claim(100, lambda: closed)
        self.assertEqual(self.m.status()['occupied'],5)
        merged = snapshot([pr(1, state='closed', merged=True)] + [pr(n) for n in range(2,6)])
        self.m.claim(100, lambda: merged)
        self.assertEqual(self.m.status()['occupied'],5)

    def test_no_claim_without_complete_audit_and_priority_approval(self):
        data = snapshot()
        self.m.sync(data)
        self.m.audit(100, 'needed', 'Evidence', 'abc')
        self.m.queue([100])
        with self.assertRaises(GateError): self.m.approve_queue('Approved')
        with self.assertRaises(GateError): self.m.claim(100, lambda: data)

    def test_pause_resume_does_not_grant_priority_approval(self):
        self.m.pause()
        self.m.resume()
        self.assertFalse(self.m.status()['queue_approved'])

    def test_changed_head_requires_selected_issue_revalidation(self):
        data = snapshot()
        self.ready(data)
        with self.assertRaises(GateError): self.m.claim(100, lambda: snapshot(head='new'))

    def test_changed_issue_or_new_issue_requires_audit(self):
        self.ready(snapshot())
        with self.assertRaises(GateError): self.m.claim(100, lambda: snapshot(issues=range(100,109)))

    def test_board_status_blocks_dispatch_and_order_is_enforced(self):
        data = snapshot()
        self.ready(data)
        with self.assertRaises(GateError): self.m.claim(101, lambda: data)
        data['board'][0]['status'] = 'Blocked'
        with self.assertRaises(GateError): self.m.claim(100, lambda: data)

    def test_changed_board_order_invalidates_dispatch(self):
        data = snapshot()
        self.ready(data)
        data['board'][0]['order'] = 99
        with self.assertRaises(GateError): self.m.claim(100, lambda: data)

    def test_one_active_worker_even_with_free_slots(self):
        data = snapshot()
        self.ready(data)
        self.m.claim(100, lambda: data)
        with self.assertRaises(GateError): self.m.claim(101, lambda: data)

    def test_bind_converts_reservation_to_pr_without_double_counting(self):
        data = snapshot()
        self.ready(data)
        self.m.claim(100, lambda: data)
        self.m.bind(100, 100, lambda: snapshot([pr(100)]))
        self.assertEqual(self.m.status()['occupied'],1)
        self.m.claim(101, lambda: snapshot([pr(100)]))
        self.assertEqual(self.m.status()['occupied'],2)

    def test_fork_branch_cannot_recover_or_bind_local_reservation(self):
        data = snapshot()
        self.ready(data)
        self.m.claim(100, lambda: data)
        fork = pr(100)
        fork['head']['repo']['full_name'] = 'someone/fork'
        self.m.sync(snapshot([fork]))
        self.assertIsNone(self.m.status()['reservations']['100']['pr'])
        with self.assertRaises(GateError): self.m.bind(100, 100, lambda: snapshot([fork]))

    def test_existing_branch_pr_cannot_be_reused_for_new_work(self):
        old = pr(100, state='closed', merged=True)
        old['body'] = 'Refs #100'
        data = snapshot([old])
        self.ready(data)
        with self.assertRaises(GateError): self.m.claim(100, lambda: data)

    def test_network_error_fails_closed_without_reservation(self):
        self.ready(snapshot())
        def failed(): raise RuntimeError('offline')
        with self.assertRaises(RuntimeError): self.m.claim(100, failed)
        self.assertEqual(self.m.status()['occupied'],0)

    def test_concurrent_claims_only_one_wins(self):
        data = snapshot([pr(n) for n in range(1,5)])
        self.ready(data)
        def run(_):
            try: Manager(self.path).claim(100, lambda: data); return True
            except GateError: return False
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            self.assertEqual(sum(pool.map(run, range(2))),1)


if __name__ == '__main__': unittest.main()
