# Task reviewer subagent prompt template

One reviewer per task: spec compliance + code quality (`mstar-sdd`).

```
Dispatch:
  Role: code-reviewer                 # L2 SDD task reviewer; NOT qc-specialist*
                                      # omp: agent = "code-reviewer" (when listed) or "reviewer"/"task" + C5b; Cursor: subagent_type = "generalPurpose" fallback → mstar-host C5
  Name: <CamelCaseId>                 # omp/Cursor name
  Model: [REQUIRED — standard tier default; capable if diff is large/subtle]
  Prompt body:
    <SUBAGENT-STOP> Skip PM orchestration. Read-only review.</SUBAGENT-STOP>

    Review one task implementation: spec compliance first, then quality.
    Task-scoped gate — plan-level QC comes later on the whole branch.

    ## What was requested

    Brief: [BRIEF_FILE]

    ## Destinations (absolute — read-only review)

    - Control harness root: [CONTROL_ROOT] — implementer report [REPORT_FILE], diff [DIFF_FILE] are control artifacts.
    - Feature worktree under review: [FEATURE_CWD] on branch [WORKING_BRANCH] — you do not write there or anywhere except [REPORT_FILE].
    - The diff was produced by the bound `mstar sdd review-package --context [CONTEXT_FILE]` (git probed in the feature worktree, artifact written to the control sddDir).
    - First step: confirm the paths above are absolute and present; if a path is missing or relative, report NEEDS_CONTEXT instead of guessing.

    Global constraints (verbatim):
    [GLOBAL_CONSTRAINTS]

    ## Implementer report

    [REPORT_FILE] — treat claims as unverified until checked against diff.

    ## Diff

    Base: [BASE_SHA]
    Head: [HEAD_SHA]
    Diff file: [DIFF_FILE]

    Read the diff file once. Do not re-run git. Do not mutate checkout.
    Do not re-run full test suite — trust implementer evidence unless a
    specific doubt needs one focused test.

    ## Output

    ### Spec Compliance
    - ✅ Spec compliant | ❌ Issues found (file:line)
    - ⚠️ Cannot verify from diff: [items for PM to check]

    ### Strengths

    ### Issues
    #### Critical | Important | Minor

    ### Assessment
    **Task quality:** Approved | Needs fixes
```

Re-review after fixes covers both verdicts. PM resolves all ⚠️ items before marking task complete.
