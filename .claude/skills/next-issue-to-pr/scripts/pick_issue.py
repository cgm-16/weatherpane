#!/usr/bin/env python3
"""Pick the next issue to work on: highest priority tier, oldest within that tier.

Reads issues from `gh issue list` (or from a file with --input, which is how the
tests drive it offline) and prints a JSON selection report on stdout.

The report is deliberately verbose about what was *not* picked. A selection you
cannot audit is a selection you cannot trust, and the skipped/unprioritized
lists are how a stale board makes itself visible instead of silently starving
issues nobody labelled.

Exit codes:
  0  a winner was selected
  3  no eligible issue (empty board, or everything filtered out)
  4  `gh` failed (not installed, not authenticated, no network)
"""

import argparse
import json
import subprocess
import sys

# Lower rank wins. Issues with no priority:* label sort last but stay eligible —
# an unlabelled issue is a triage gap, not a reason to refuse to work.
PRIORITY_RANK = {"priority:p0": 0, "priority:p1": 1, "priority:p2": 2, "priority:p3": 3}
NO_PRIORITY_RANK = 99

# An issue carrying one of these is already someone's (or some agent's) work in
# flight. Selecting it again is the single most likely way this pipeline burns a
# run doing duplicate work.
IN_FLIGHT_STATUSES = ("status:blocked", "status:in-progress", "status:review")

# The label taxonomy and the branch-name taxonomy are not the same vocabulary:
# issues are labelled `type:bug` / `type:feature`, while branch-and-commit types
# in branching-and-issues.md are `fix` / `feat`. Translate rather than leak the
# label spelling into a branch name that violates the convention.
LABEL_TO_BRANCH_TYPE = {
    "bug": "fix",
    "feature": "feat",
    "chore": "chore",
    "docs": "docs",
    "ci": "ci",
    "refactor": "refactor",
    "test": "test",
}

GH_FIELDS = "number,title,labels,createdAt,url,assignees,milestone"


def fetch_issues(repo=None, limit=200):
    cmd = ["gh", "issue", "list", "--state", "open", "--limit", str(limit), "--json", GH_FIELDS]
    if repo:
        cmd += ["--repo", repo]
    try:
        out = subprocess.run(cmd, capture_output=True, text=True, check=True).stdout
    except FileNotFoundError:
        print(json.dumps({"error": "gh is not installed or not on PATH"}), file=sys.stderr)
        sys.exit(4)
    except subprocess.CalledProcessError as exc:
        print(json.dumps({"error": "gh issue list failed", "stderr": exc.stderr.strip()}), file=sys.stderr)
        sys.exit(4)
    return json.loads(out)


def label_names(issue):
    return [label["name"] for label in issue.get("labels", [])]


def priority_of(names):
    """Highest priority wins when an issue carries several priority labels."""
    ranks = [PRIORITY_RANK[n] for n in names if n in PRIORITY_RANK]
    return min(ranks) if ranks else NO_PRIORITY_RANK


def first_with_prefix(names, prefix):
    for name in names:
        if name.startswith(prefix):
            return name[len(prefix):]
    return None


def rank_label(rank):
    for name, value in PRIORITY_RANK.items():
        if value == rank:
            return name
    return None


def describe(issue, names):
    rank = priority_of(names)
    return {
        "number": issue["number"],
        "title": issue["title"],
        "url": issue.get("url"),
        "createdAt": issue["createdAt"],
        "labels": names,
        "priority": rank_label(rank),
        "type": first_with_prefix(names, "type:"),
        "area": first_with_prefix(names, "area:"),
        "assignees": [a.get("login") for a in issue.get("assignees") or []],
        "milestone": (issue.get("milestone") or {}).get("title"),
    }


def select(issues):
    eligible, skipped = [], []

    for issue in issues:
        names = label_names(issue)
        blocking = [s for s in IN_FLIGHT_STATUSES if s in names]
        if blocking:
            entry = describe(issue, names)
            entry["skipped_because"] = blocking
            skipped.append(entry)
        else:
            eligible.append((issue, names))

    # GitHub timestamps are UTC and Z-suffixed, so lexicographic order on the
    # raw string is chronological order — no parsing needed.
    ordered = sorted(eligible, key=lambda pair: (priority_of(pair[1]), pair[0]["createdAt"]))
    ranked = [describe(issue, names) for issue, names in ordered]

    winner = ranked[0] if ranked else None
    tier_size = len([r for r in ranked if winner and r["priority"] == winner["priority"]])

    return {
        "selected": winner,
        "runners_up": ranked[1:4],
        "skipped_in_flight": skipped,
        "unprioritized": [r for r in ranked if r["priority"] is None],
        "eligible_count": len(ranked),
        "tier_size": tier_size,
    }


def explain(report):
    """One sentence stating why the winner beat the field, for the run log."""
    winner = report["selected"]
    if not winner:
        return "No eligible issue."
    tier = winner["priority"] or "no priority label"
    size = report["tier_size"]
    rank = f"oldest of {size} issues in that tier" if size > 1 else "only issue in that tier"
    return f"#{winner['number']} — {tier}, {rank} (created {winner['createdAt']})."


def suggest_branch(winner):
    """Assemble the `type/issue-area-slug` prefix the repo's branch convention wants.

    The slug itself is left to the caller: it comes from the issue's substance,
    which a label cannot supply.
    """
    if not winner:
        return None
    kind = LABEL_TO_BRANCH_TYPE.get(winner["type"], "chore")
    area = winner["area"] or "general"
    return f"{kind}/{winner['number']}-{area}-<slug>"


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--repo", help="owner/name; defaults to the current repo")
    parser.add_argument("--input", help="read issue JSON from this file instead of calling gh (used by tests)")
    parser.add_argument("--limit", type=int, default=200)
    args = parser.parse_args()

    if args.input:
        with open(args.input) as handle:
            issues = json.load(handle)
    else:
        issues = fetch_issues(args.repo, args.limit)

    report = select(issues)
    report["reason"] = explain(report)
    report["branch_prefix"] = suggest_branch(report["selected"])

    print(json.dumps(report, indent=2, ensure_ascii=False))
    sys.exit(0 if report["selected"] else 3)


if __name__ == "__main__":
    main()
