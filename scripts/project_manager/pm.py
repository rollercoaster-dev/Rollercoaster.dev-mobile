#!/usr/bin/env python3
"""Persistent admission control for the Rollercoaster issue queue. Never merges."""
import argparse
import contextlib
import json
import re
import sqlite3
import subprocess
import time
from pathlib import Path

REPO = 'rollercoaster-dev/Rollercoaster.dev-mobile'
DEFAULT_STATE = Path.home() / '.local/state/rollercoaster-pm'


class GateError(Exception):
    pass


def excluded(pr):
    author = pr['user']['login']
    return author == 'dependabot[bot]' or (
        author == 'github-actions[bot]' and
        pr['head']['ref'].startswith('release-please--branches--'))


def linked_issues(pr):
    return {int(n) for n in re.findall(r'(?i)(?:closes?|fix(?:es)?|resolves?)\s+#(\d+)\b', pr.get('body') or '')}


class Manager:
    def __init__(self, directory=DEFAULT_STATE):
        self.directory = Path(directory).expanduser()
        self.directory.mkdir(parents=True, exist_ok=True, mode=0o700)
        self.db = self.directory / 'manager.sqlite3'
        with sqlite3.connect(self.db, timeout=120) as conn:
            conn.execute('CREATE TABLE IF NOT EXISTS state (id INTEGER PRIMARY KEY, data TEXT NOT NULL)')
            conn.execute('INSERT OR IGNORE INTO state VALUES (1, ?)', (json.dumps(dict(
                paused=False, approved=None, queue=[], audits={}, reservations={}, prs={},
                snapshot=None, synced_at=None)),))
        self.db.chmod(0o600)

    @contextlib.contextmanager
    def transaction(self):
        conn = sqlite3.connect(self.db, timeout=120)
        try:
            conn.execute('BEGIN IMMEDIATE')
            state = json.loads(conn.execute('SELECT data FROM state WHERE id=1').fetchone()[0])
            yield state
            conn.execute('UPDATE state SET data=? WHERE id=1', (json.dumps(state),))
            conn.commit()
        except BaseException:
            conn.rollback()
            raise
        finally:
            conn.close()

    def _sync(self, s, data):
        if not data.get('head') or not isinstance(data.get('prs'), list) or not isinstance(data.get('issues'), list) or not isinstance(data.get('board'), list):
            raise GateError('Incomplete GitHub snapshot; dispatch stopped')
        incoming = {str(p['number']): p for p in data['prs']}
        # Previously observed PRs must never vanish because of a partial read.
        if set(s['prs']) - set(incoming):
            raise GateError('Snapshot omitted tracked PRs; dispatch stopped')
        for key, p in incoming.items():
            if not excluded(p) and (p['state'] == 'open' or key in s['prs']):
                s['prs'][key] = p
        for reservation in s['reservations'].values():
            # Recover a create-PR/bind crash via the uniquely named issue branch.
            if reservation.get('pr') is None:
                matches = [p for p in s['prs'].values() if p['head']['ref'] == reservation['branch'] and (p['head'].get('repo') or {}).get('full_name') == REPO and p['number'] not in reservation.get('seen_prs', [])]
                if len(matches) == 1:
                    reservation['pr'] = matches[0]['number']
        s['snapshot'] = data
        s['synced_at'] = time.time()

    def sync(self, data):
        with self.transaction() as s:
            self._sync(s, data)
        return self.status()

    def _occupied(self, s):
        # A close without merge is deliberately retained until manually resolved.
        prs = sum(not p.get('merged_at') for p in s['prs'].values())
        reservations = sum(r.get('pr') is None for r in s['reservations'].values())
        return prs + reservations

    def _unaudited(self, s):
        return [i['number'] for i in (s['snapshot'] or {}).get('issues', [])
                if s['audits'].get(str(i['number']), {}).get('issue_updated_at') != i['updated_at']]

    def status(self):
        with self.transaction() as s:
            covered = set(s['reservations'])
            for p in s['prs'].values():
                covered.update(str(n) for n in linked_issues(p))
            return dict(pending_queue=[n for n in s['queue'] if str(n) not in covered], paused=s['paused'], mode='execution' if s['approved'] else 'audit',
                queue_approved=bool(s['approved']), occupied=self._occupied(s), limit=5,
                prs=list(s['prs'].values()), reservations=s['reservations'], queue=s['queue'],
                audits=s['audits'], unaudited=self._unaudited(s),
                issue_count=len((s['snapshot'] or {}).get('issues', [])), synced_at=s['synced_at'])

    def snapshot(self):
        with self.transaction() as s:
            return s['snapshot']

    def pause(self):
        with self.transaction() as s: s['paused'] = True
        return self.status()

    def resume(self):
        with self.transaction() as s: s['paused'] = False
        return self.status()

    def audit(self, issue, verdict, evidence, head):
        if verdict not in ('needed', 'implemented', 'superseded', 'duplicate', 'blocked', 'decision'):
            raise GateError('Unknown relevance verdict')
        if not evidence.strip(): raise GateError('Evidence is required')
        with self.transaction() as s:
            current = next((i for i in (s['snapshot'] or {}).get('issues', []) if i['number'] == issue), None)
            if current is None: raise GateError('Issue is not in the current open issue snapshot')
            if head != s['snapshot']['head']: raise GateError('Audit must reference current main SHA')
            s['audits'][str(issue)] = dict(verdict=verdict, evidence=evidence, head=head,
                issue_updated_at=current['updated_at'], reviewed_at=time.time())
        return {'audited': issue, 'verdict': verdict}

    def queue(self, issues):
        if len(set(issues)) != len(issues): raise GateError('Duplicate queue issue')
        with self.transaction() as s:
            s['queue'] = issues
            s['approved'] = None
        return {'queue': issues, 'approved': False}

    def approve_queue(self, reference):
        if not reference.strip(): raise GateError('Explicit user approval reference required')
        with self.transaction() as s:
            if not s['snapshot'] or self._unaudited(s): raise GateError('Audit every open issue first')
            if not s['queue']: raise GateError('Queue is empty')
            if any(s['audits'].get(str(n), {}).get('verdict') != 'needed' for n in s['queue']):
                raise GateError('Queue includes issues not assessed as needed')
            board = {i['number']: i for i in s['snapshot']['board']}
            if any(n not in board or board[n]['status'] != 'Next' or board[n].get('order') is None for n in s['queue']):
                raise GateError('Queue must have Next status and explicit Execution order on board')
            orders = [board[n]['order'] for n in s['queue']]
            if orders != sorted(orders) or len(set(orders)) != len(orders):
                raise GateError('Board order must match the proposed queue')
            s['approved'] = dict(reference=reference, at=time.time(),
                board={str(n): {'order': board[n]['order'], 'priority': board[n].get('priority')} for n in s['queue']})
        return {'approved': True}

    def _eligible(self, s, issue):
        if s['paused']: raise GateError('Dispatch is paused')
        if not s['approved']: raise GateError('Awaiting agreed priorities')
        if self._unaudited(s): raise GateError('Open issue audit is incomplete or changed')
        if self._occupied(s) >= 5: raise GateError('Five slots occupied; wait for a human merge')
        if any(r.get('pr') is None for r in s['reservations'].values()):
            raise GateError('An implementation is already active; resume it')
        existing = set(s['reservations'])
        for p in s['prs'].values():
            existing.update(str(n) for n in linked_issues(p))
        pending = [n for n in s['queue'] if str(n) not in existing]
        if any(p['head']['ref'] == f'codex/issue-{issue}' and (p['head'].get('repo') or {}).get('full_name') == REPO for p in s['snapshot']['prs']):
            raise GateError('Issue branch already has PR history; inspect and resume existing work')
        if not pending or issue != pending[0]: raise GateError('Issue is not next in the agreed queue')
        current_board = {str(i['number']): i for i in s['snapshot']['board']}
        for n in pending:
            b = current_board.get(str(n), {})
            if {'order': b.get('order'), 'priority': b.get('priority')} != s['approved']['board'].get(str(n)):
                raise GateError('Board priorities/order changed; agree and approve the queue again')
        audit = s['audits'].get(str(issue), {})
        if audit.get('verdict') != 'needed' or audit.get('head') != s['snapshot']['head']:
            raise GateError('Revalidate selected issue against current main before starting')
        board = next((i for i in s['snapshot']['board'] if i['number'] == issue), None)
        if not board or board['status'] != 'Next': raise GateError('Selected issue must be Next on the board')
        current = next(i for i in s['snapshot']['issues'] if i['number'] == issue)
        labels = {label['name'] for label in current.get('labels', [])}
        if labels & {'hitl', 'needs:design', 'dep:blocked', 'type:epic'}:
            raise GateError('Issue requires human input, design, dependencies, or decomposition')

    def claim(self, issue, fetch):
        # Network refresh is INSIDE the transaction: concurrent claimants cannot use
        # an older snapshot to erase another claimant's reservation.
        error = None
        with self.transaction() as s:
            self._sync(s, fetch())
            try:
                self._eligible(s, issue)
            except GateError as exc:
                error = exc
            if error is None:
                s['reservations'][str(issue)] = dict(branch=f'codex/issue-{issue}', pr=None, started_at=time.time(), seen_prs=[p['number'] for p in s['snapshot']['prs']])
                result = dict(issue=issue, **s['reservations'][str(issue)])
        if error: raise error
        return result

    def check_pr(self, issue, fetch):
        with self.transaction() as s:
            self._sync(s, fetch())
            r = s['reservations'].get(str(issue))
            if not r: raise GateError('No reservation for this issue')
            if r['pr'] is not None: raise GateError('PR already exists; maintain it instead')
            if self._occupied(s) > 5: raise GateError('External PRs filled capacity; hold this work')
            if s['paused']: raise GateError('Dispatch paused; do not publish new PR')
            return dict(issue=issue, **r)

    def bind(self, issue, number, fetch):
        with self.transaction() as s:
            self._sync(s, fetch())
            r = s['reservations'].get(str(issue))
            p = s['prs'].get(str(number))
            if not r or not p or p['head']['ref'] != r['branch'] or (p['head'].get('repo') or {}).get('full_name') != REPO:
                raise GateError('PR does not match reserved issue branch')
            r['pr'] = number
        return {'issue': issue, 'pr': number}


def gh(*args):
    result = subprocess.run(['gh', *args], capture_output=True, text=True, timeout=90)
    if result.returncode: raise GateError('GitHub read failed: ' + result.stderr.strip()[:400])
    return json.loads(result.stdout)


def fetch_snapshot(manager, issue=None):
    def pages(endpoint):
        return [item for page in gh('api', '--paginate', '--slurp', endpoint) for item in page]
    prs = pages(f'repos/{REPO}/pulls?state=open&per_page=100')
    with sqlite3.connect(manager.db, timeout=120) as conn:
        saved = json.loads(conn.execute('SELECT data FROM state WHERE id=1').fetchone()[0])
    present = {str(p['number']) for p in prs}
    for key, old in saved['prs'].items():
        if key not in present:
            prs.append(old if old.get('merged_at') else gh('api', f'repos/{REPO}/pulls/{key}'))
    if issue is not None:
        known = {p['number'] for p in prs}
        history = pages(f'repos/{REPO}/pulls?state=all&head=rollercoaster-dev:codex/issue-{issue}&per_page=100')
        prs.extend(p for p in history if p['number'] not in known)
    issues = [i for i in pages(f'repos/{REPO}/issues?state=open&per_page=100') if 'pull_request' not in i]
    project = gh('project', 'item-list', '14', '--owner', 'rollercoaster-dev', '--limit', '10000', '--format', 'json')
    if project['totalCount'] != len(project['items']): raise GateError('Board pagination incomplete')
    board = [dict(number=i['content']['number'], status=i.get('status'), priority=i.get('priority'),
                  order=i.get('execution order')) for i in project['items']
             if i.get('content', {}).get('type') == 'Issue' and i.get('repository') == f'https://github.com/{REPO}']
    return dict(prs=prs, issues=issues, board=board, head=gh('api', f'repos/{REPO}/commits/main')['sha'])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--state-dir', type=Path, default=DEFAULT_STATE)
    sub = parser.add_subparsers(dest='command', required=True)
    for name in ('status', 'snapshot', 'sync', 'pause', 'resume'): sub.add_parser(name)
    audit = sub.add_parser('audit'); audit.add_argument('issue', type=int)
    audit.add_argument('verdict'); audit.add_argument('--evidence', required=True); audit.add_argument('--head', required=True)
    queue = sub.add_parser('queue'); queue.add_argument('issues', type=int, nargs='+')
    approve = sub.add_parser('approve-queue'); approve.add_argument('--approval-ref', required=True)
    for name in ('claim', 'check-pr', 'bind'):
        p = sub.add_parser(name); p.add_argument('issue', type=int)
        if name == 'bind': p.add_argument('pr', type=int)
    args = parser.parse_args(); manager = Manager(args.state_dir)
    fetch = lambda: fetch_snapshot(manager, getattr(args, 'issue', None))
    try:
        if args.command in ('status', 'snapshot', 'pause', 'resume'): result = getattr(manager, args.command)()
        elif args.command == 'sync': result = manager.sync(fetch())
        elif args.command == 'audit': result = manager.audit(args.issue, args.verdict, args.evidence, args.head)
        elif args.command == 'queue': result = manager.queue(args.issues)
        elif args.command == 'approve-queue':
            manager.sync(fetch()); result = manager.approve_queue(args.approval_ref)
        elif args.command == 'claim': result = manager.claim(args.issue, fetch)
        elif args.command == 'check-pr': result = manager.check_pr(args.issue, fetch)
        else: result = manager.bind(args.issue, args.pr, fetch)
        print(json.dumps(result))
    except (GateError, subprocess.TimeoutExpired) as exc:
        print(json.dumps({'error': str(exc)})); raise SystemExit(1)


if __name__ == '__main__': main()
