# Issue-to-PR workflow cost audit

## Scope and method

Issue #140 adds `.claude/skills/next-issue-to-pr-lean/SKILL.md` as an alternative, with `.agents/skills/next-issue-to-pr-lean/` as its Codex wrapper. This follows the layout declared in `docs/superpowers/specs/2026-07-31-next-issue-to-pr-codex-wrapper-design.md`: the canonical body lives under `.claude/`, and the `.agents/` entry point only resolves and delegates to it, so both harnesses read one document. The original skill pair and the picker remain unchanged. Invoke `$next-issue-to-pr-lean` from a checkout containing the new skill. Its description targets requests for the lean workflow, leaving ordinary original-skill requests intact.

This is a source audit and simulated decision test, not a paired live issue benchmark. Counts below use `wc -w -c`; words and bytes are not model tokens. Historical token figures quoted by the original skill were not independently verified.

## Findings

| Source of cost          | Existing workflow                                                 | Lean alternative                                                              |
| ----------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Always-loaded procedure | Canonical skill plus SDD and conditional sub-skills               | One standalone procedure; mandatory repository and area guidance remains      |
| Coordination            | Researcher, planner, implementer, task reviewer, final reviewer   | Main conversation investigates/plans/implements; one independent final review |
| Handoffs                | Ground truth, plan, task briefs, reports, ledger, review packages | One temporary plan/continuity note plus verification logs and PR body         |
| Check repetition        | Per-task implementation can repeat broad checks                   | Reuse evidence for unchanged code; rerun affected checks after edits          |
| Context                 | Router prohibits source/plan reading and transfers file paths     | Read relevant owners/callers directly once per context; bound tool output     |

For a specified docs-only issue with two related edits forming one coherent task, an independent baseline simulation found at least five dispatches and nine logical artifacts. Two separately reviewed tasks require at least seven dispatches. SDD 6.3.0 already combines spec/quality review and discourages rerunning checks on unchanged code; the reduction is primarily removal of its mandatory orchestration, not correction of a universally redundant test loop.

The original's named-issue instruction also says to skip the stage containing the claim. The alternative explicitly claims both selected and named issues, checks existing work, restores owned claims on pre-PR abort, and checks CI against the latest PR head.

## Static size

| Loaded document            | Words |  Bytes |
| -------------------------- | ----: | -----: |
| Original canonical skill   | 4,891 | 30,885 |
| Installed SDD 6.3.0        | 4,825 | 32,339 |
| Original + SDD             | 9,716 | 63,224 |
| Lean skill, canonical body | 1,139 |  8,235 |
| Lean skill, Codex wrapper  |   166 |  1,125 |

The canonical lean body is 76.7% fewer words than the original canonical skill and 88.3% fewer than original + SDD. Codex additionally loads the 166-word wrapper, matching the existing non-lean pair. This excludes common repository guidance and any other skills required by the active harness. Runtime savings remain unmeasured: cache pricing, task complexity, model, inherited context, turns, and retries affect actual cost.

## Preserved delivery contract

- Reuse the existing priority/age picker and its filtering/exit behavior.
- Preserve unrelated user work; use an issue-linked feature branch based on fetched main.
- Read applicable constraints and use failing checks for behavior changes.
- Retain lint, typecheck, applicable tests, UI evidence, and docs updates.
- Review specification alignment and correctness independently when delegation exists.
- Fill the PR template, synchronize metadata/status, keep the issue open, and do not merge.
- Finish only after latest-head CI passes; report blockers and verification gaps honestly.

## Validation protocol

The independent baseline read the original before the alternative existed. A separate fresh-context evaluator simulated the new skill against repository rules and these scenarios, and compared the original workflow for outcome invariants. The evaluator was independent of the author but not blind to the original. Remote mutations were prohibited:

1. Named docs-only issue, two related edits, clean baseline: one implementation loop and one final review.
2. Picker exits 3: stop without claim, branch, or PR.
3. Dirty main checkout: preserve edits and isolate work.
4. Local checks pass but CI fails: fix/review/recheck the new head before completion.
5. Abort before PR with original ready status: release this run's claim and restore status.
6. Named issue already in progress with a PR: inspect ownership and resume only authorized work.

The evaluator followed all six expected branches and found one ambiguity: claiming a resumed PR could regress its review status. The final skill preserves review status when resuming and takes no new claim. Focused re-review passed the corrected branch.

Observed checks: the existing picker suite passed all 13 tests; the skill frontmatter validator, `pnpm lint`, `pnpm typecheck`, and `git diff --check` passed. No app behavior or UI changes are involved, so app unit/integration additions and Playwright screenshots are inapplicable. Simulation establishes decision coverage, not a guarantee of future agent behavior or measured end-to-end token reduction.

For a runtime comparison, use equivalent isolated task snapshots and the same model/harness; record input/output/cache tokens, dispatches, tool calls, verification outcomes, and elapsed time. Keep this audit out of routine skill loading.

## Harness layout follow-up

An earlier revision placed the lean body under `.agents/` alone, which inverted the wrapper spec and left Claude Code without the lean workflow even though the body was already harness-agnostic. Relocating the body to `.claude/` and adding the standard wrapper pair resolves both. The body now also states that it supersedes the original skill's router model and context budget, because a Claude agent holding both would otherwise face contradictory instructions about reading source files, and names the `Agent` dispatch used for the independent final review.

## PR review follow-up

Review identified two resume gaps: a fresh checkout could branch from main instead of the existing PR head, and the shipping step could overwrite a retained workflow status such as `status:qa`. The revised skill separates new and resumed runs: resume the fetched PR head and compare its SHA and reconcile any divergence before editing; retain existing issue/PR statuses and metadata when reusing a PR. The original six-case simulation did not cover these cases end to end. Focused validation covers a missing local PR branch, an existing QA status, and the unchanged new-run path.

A subsequent review identified missing pre-worktree inspection of matching local branches and a stale-label cleanup risk. The skill now reconciles local-only commits before workspace creation and re-reads issue state/activity before claim cleanup. Named issues with blocked or active workflow statuses require authorization covering the transition. A blanket ready-only gate was rejected: the canonical picker accepts unlabelled issues, and existing user authorization carries forward. Labels are not an atomic ownership lock; ambiguous concurrent activity is preserved and reported rather than overwritten.

Independent review-reception validation also reproduced that the shared picker can select QA/released issues. The status/ownership gate now applies to both selected and named issues, with superseded workflow labels removed only for an authorized transition. The picker remains unchanged, including ready/unlabelled eligibility.
