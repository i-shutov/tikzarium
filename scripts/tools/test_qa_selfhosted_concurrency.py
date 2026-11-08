"""Prevent PR workflow_run events from displacing real personal Windows Server runs.

Tests parse the canonical workflow source without needing to launch a persistent
runner. GitHub concurrency admits one pending run per group by default: putting
PR no-op workflow events in the same group silently cancels older pending main QA.
"""
from pathlib import Path
import unittest

WORKFLOW=(Path(__file__).resolve().parents[2] / '.github' / 'workflows' /
          'qa-selfhosted-winserver.yml')


def group_for(event_name: str, upstream_event: str,
              upstream_head: str, run_id: int,
              ref: str = 'refs/heads/main') -> str:
    trusted_main=((event_name == 'workflow_dispatch' and ref == 'refs/heads/main') or
                  (event_name == 'workflow_run' and upstream_event == 'push'
                   and upstream_head == 'main'))
    return ('tikzarium-trusted-winserver-main' if trusted_main else
            f'tikzarium-ignored-workflow-run-{run_id}')


class WinServerConcurrencyAcceptance(unittest.TestCase):
    def setUp(self):
        self.source=WORKFLOW.read_text(encoding='utf-8')

    def test_workflow_concurrency_is_source_event_aware(self):
        s=self.source
        self.assertIn("github.event_name == 'workflow_dispatch' && github.ref == 'refs/heads/main'",s)
        self.assertIn("github.event_name == 'workflow_run'",s)
        self.assertIn("github.event.workflow_run.event == 'push'",s)
        self.assertIn("github.event.workflow_run.head_branch == 'main'",s)
        self.assertIn("format('tikzarium-ignored-workflow-run-{0}', github.run_id)",s)
        self.assertIn("&& 'tikzarium-trusted-winserver-main' ||",s)
        self.assertIn("cancel-in-progress: false",s)

    def test_pr_noop_events_never_displace_main(self):
        main=group_for('workflow_run','push','main',42)
        self.assertEqual(main,'tikzarium-trusted-winserver-main')
        for event in ('pull_request','workflow_dispatch','workflow_run'):
            if event=='workflow_dispatch':
                continue  # Explicit manual dispatch is intentionally serialized.
            self.assertNotEqual(group_for('workflow_run',event,'main',43),main)
            self.assertNotEqual(group_for('workflow_run',event,'other-branch',44),main)
        self.assertNotEqual(group_for('workflow_run','pull_request','main',45),
                            group_for('workflow_run','pull_request','main',46))

    def test_manual_dispatch_shares_trusted_main_lease(self):
        self.assertEqual(group_for('workflow_dispatch','','',101),
                         'tikzarium-trusted-winserver-main')

    def test_off_main_manual_dispatch_never_displaces_main_queue(self):
        self.assertNotEqual(
            group_for('workflow_dispatch','','',203,'refs/heads/feature'),
            'tikzarium-trusted-winserver-main')
        self.assertNotEqual(
            group_for('workflow_dispatch','','',203,'refs/heads/feature'),
            group_for('workflow_dispatch','','',204,'refs/heads/feature'))

    def test_job_still_refuses_unreviewed_pr_and_nonmain_manual(self):
        s=self.source
        self.assertIn("github.event.workflow_run.event == 'push'",s)
        self.assertIn("github.event.workflow_run.conclusion == 'success'",s)
        self.assertIn("github.event_name == 'workflow_dispatch' && github.ref == 'refs/heads/main'",s)
        self.assertIn("runs-on: [self-hosted, Windows, X64, tikzarium-winserver]",s)
        self.assertIn("if($branch.commit.sha -cne $actual)",s)
        self.assertIn("ci.status -cne 'completed' -or $ci.conclusion -cne 'success'",s)


if __name__=='__main__':
    unittest.main()
