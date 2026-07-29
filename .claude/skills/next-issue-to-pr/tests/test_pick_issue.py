#!/usr/bin/env python3
"""Offline tests for the issue picker.

Selection is the one part of this pipeline with a single right answer, so it is
tested against fixtures rather than by watching an agent run. Run:

    python3 .claude/skills/next-issue-to-pr/tests/test_pick_issue.py
"""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

import pick_issue  # noqa: E402


def issue(number, created, labels=(), title="t", assignees=(), milestone=None):
    return {
        "number": number,
        "title": title,
        "url": f"https://github.com/o/r/issues/{number}",
        "createdAt": created,
        "labels": [{"name": name} for name in labels],
        "assignees": [{"login": a} for a in assignees],
        "milestone": {"title": milestone} if milestone else None,
    }


class TestSelection(unittest.TestCase):
    def test_highest_priority_wins_over_older_lower_priority(self):
        """Priority is the primary key — an ancient p3 must not beat a fresh p0."""
        report = pick_issue.select([
            issue(1, "2020-01-01T00:00:00Z", ["priority:p3"]),
            issue(2, "2026-07-28T09:00:00Z", ["priority:p0"]),
        ])
        self.assertEqual(report["selected"]["number"], 2)

    def test_oldest_wins_within_a_tier(self):
        report = pick_issue.select([
            issue(1, "2026-07-28T09:00:00Z", ["priority:p1"]),
            issue(2, "2026-07-28T07:00:00Z", ["priority:p1"]),
            issue(3, "2026-07-28T08:00:00Z", ["priority:p1"]),
        ])
        self.assertEqual(report["selected"]["number"], 2)
        self.assertEqual(report["tier_size"], 3)

    def test_in_flight_statuses_are_skipped(self):
        for status in ("status:blocked", "status:in-progress", "status:review"):
            with self.subTest(status=status):
                report = pick_issue.select([
                    issue(1, "2026-01-01T00:00:00Z", ["priority:p0", status]),
                    issue(2, "2026-02-01T00:00:00Z", ["priority:p2"]),
                ])
                self.assertEqual(report["selected"]["number"], 2)
                self.assertEqual(report["skipped_in_flight"][0]["number"], 1)
                self.assertEqual(report["skipped_in_flight"][0]["skipped_because"], [status])

    def test_other_status_labels_do_not_block(self):
        """status:ready and status:needs-triage are not work-in-flight signals."""
        report = pick_issue.select([
            issue(1, "2026-01-01T00:00:00Z", ["priority:p0", "status:ready"]),
            issue(2, "2026-01-02T00:00:00Z", ["priority:p0", "status:needs-triage"]),
        ])
        self.assertEqual(report["selected"]["number"], 1)
        self.assertEqual(report["skipped_in_flight"], [])

    def test_unprioritized_sorts_last_but_stays_eligible(self):
        report = pick_issue.select([
            issue(1, "2020-01-01T00:00:00Z", ["type:chore"]),
            issue(2, "2026-01-01T00:00:00Z", ["priority:p3"]),
        ])
        self.assertEqual(report["selected"]["number"], 2)
        self.assertEqual([u["number"] for u in report["unprioritized"]], [1])

    def test_unprioritized_is_selected_when_it_is_all_there_is(self):
        report = pick_issue.select([issue(1, "2026-01-01T00:00:00Z", ["type:bug"])])
        self.assertEqual(report["selected"]["number"], 1)
        self.assertIsNone(report["selected"]["priority"])

    def test_highest_priority_wins_when_an_issue_carries_several(self):
        report = pick_issue.select([
            issue(1, "2026-02-01T00:00:00Z", ["priority:p3", "priority:p0"]),
            issue(2, "2026-01-01T00:00:00Z", ["priority:p1"]),
        ])
        self.assertEqual(report["selected"]["number"], 1)
        self.assertEqual(report["selected"]["priority"], "priority:p0")

    def test_empty_and_fully_filtered_boards_select_nothing(self):
        self.assertIsNone(pick_issue.select([])["selected"])
        blocked = pick_issue.select([issue(1, "2026-01-01T00:00:00Z", ["status:blocked"])])
        self.assertIsNone(blocked["selected"])
        self.assertEqual(blocked["eligible_count"], 0)

    def test_branch_prefix_translates_label_type_to_branch_type(self):
        """`type:bug` must become branch type `fix`, not `bug`."""
        for label_type, branch_type in (("bug", "fix"), ("feature", "feat"), ("refactor", "refactor")):
            with self.subTest(label_type=label_type):
                report = pick_issue.select([
                    issue(1, "2026-01-01T00:00:00Z", ["priority:p0", f"type:{label_type}", "area:weather"]),
                ])
                self.assertEqual(
                    pick_issue.suggest_branch(report["selected"]),
                    f"{branch_type}/1-weather-<slug>",
                )

    def test_branch_prefix_falls_back_when_labels_are_missing(self):
        report = pick_issue.select([issue(9, "2026-01-01T00:00:00Z", ["priority:p0"])])
        self.assertEqual(pick_issue.suggest_branch(report["selected"]), "chore/9-general-<slug>")

    def test_issue_metadata_is_carried_for_pr_sync(self):
        report = pick_issue.select([
            issue(1, "2026-01-01T00:00:00Z", ["priority:p0"], assignees=["ori"], milestone="v1"),
        ])
        self.assertEqual(report["selected"]["assignees"], ["ori"])
        self.assertEqual(report["selected"]["milestone"], "v1")


class TestRealBoardSnapshot(unittest.TestCase):
    """A snapshot of the weatherpane board taken 2026-07-28.

    #73 is p0 and also the oldest open issue, so it must win. This is the
    sanity check that the whole ordering behaves on real data, not just on
    hand-built pairs.
    """

    BOARD = [
        issue(88, "2026-07-28T08:22:00Z", ["type:bug", "priority:p2", "area:theme"]),
        issue(87, "2026-07-28T07:42:40Z", ["type:feature", "priority:p1", "area:weather"]),
        issue(84, "2026-07-28T07:17:13Z", ["type:bug", "priority:p1", "area:ci"]),
        issue(83, "2026-07-28T07:12:21Z", ["type:chore", "priority:p3", "area:ci"]),
        issue(82, "2026-07-28T07:12:02Z", ["type:chore", "priority:p3", "area:app-shell"]),
        issue(81, "2026-07-28T07:11:51Z", ["type:refactor", "priority:p2", "area:favorites"]),
        issue(80, "2026-07-28T07:11:30Z", ["type:chore", "priority:p1", "area:search"]),
        issue(79, "2026-07-28T07:08:39Z", ["type:chore", "priority:p2", "area:ci"]),
        issue(78, "2026-07-28T07:08:24Z", ["type:feature", "priority:p2", "area:app-shell"]),
        issue(77, "2026-07-28T07:08:02Z", ["type:feature", "priority:p1", "area:app-shell"]),
        issue(75, "2026-07-28T07:07:26Z", ["type:docs", "priority:p1", "area:docs"]),
        issue(74, "2026-07-28T07:06:54Z", ["type:bug", "priority:p1", "area:app-shell"]),
        issue(73, "2026-07-28T07:06:31Z", ["type:bug", "priority:p0", "area:weather"]),
    ]

    def test_p0_wins_the_real_board(self):
        report = pick_issue.select(self.BOARD)
        self.assertEqual(report["selected"]["number"], 73)
        self.assertEqual(pick_issue.suggest_branch(report["selected"]), "fix/73-weather-<slug>")

    def test_next_up_is_the_oldest_p1_once_p0_is_in_flight(self):
        board = [dict(i) for i in self.BOARD]
        board[-1] = issue(73, "2026-07-28T07:06:31Z", ["type:bug", "priority:p0", "status:in-progress"])
        report = pick_issue.select(board)
        self.assertEqual(report["selected"]["number"], 74)


if __name__ == "__main__":
    unittest.main(verbosity=2)
