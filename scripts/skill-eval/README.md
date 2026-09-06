# skill-eval baseline (plan 20260907-skill-eval-baseline, Spec A1)

Maintenance-only evaluation harness for reproducible skill comparisons. Task 1
(this directory today) delivers the **frozen case set** and the **prepare**
stage that resolves an immutable manifest v1. The `run`/`report` stages
(subprocess runner, grading, metrics) arrive with Task 2.

## What prepare does

- Validates the runner-owned **nonsecret** config and the frozen 30-case set.
- Resolves **manifest v1**: pinned full-SHA source refs, CLI identity, config
  hash, per-arm skill/reference closure hashes (`sha256`), per-case fixture
  and integrity hashes, and a **heldout digest frozen before any tuning**.
- Materializes case fixtures **only** under the disposable root
  `<repoRoot>/.tmp/skill-eval/` (gitignored). Real main/control checkouts are
  never a write target; symlink escapes are rejected.
- Performs **zero model calls**. The only production subprocess is read-only
  git (`git ls-tree -r -z <sha> -- skills` + `git cat-file blob`), routed
  through a single injected exec seam so tests can spy on it (spy count = 0
  in the prepare suite).

Exit codes (Spec A1): `0` = immutable manifest + fixtures written; `2` =
invalid config/cases/target, **nothing written anywhere**.

## Usage (Task 1 staging entry)

```bash
bun scripts/skill-eval/manifest.ts prepare \
  --config /absolute/path/config.json \
  --out /absolute/path/under/.tmp/skill-eval/<run-dir> \
  --repo-root /absolute/path/to/feature/worktree
```

`--out` must resolve strictly inside `<repoRoot>/.tmp/skill-eval/`. The
canonical dispatcher `scripts/skill-eval/index.ts prepare ...` (Spec A1 CLI)
lands with the Task 2 runner and calls these exported functions unchanged.

Example config (all fields required; no secret-shaped keys):

```json
{
  "plan": "20260907-skill-eval-baseline",
  "sourceRefs": { "baseline": "<40-hex sha>", "candidate": "<40-hex sha>" },
  "cli": { "path": "/opt/homebrew/bin/codex", "version": "codex-cli 0.144.1", "helpHash": "<64-hex sha256 of recorded help output>" },
  "requestedModel": null,
  "requestedModelReason": "no named-model override authorized",
  "observedModel": null,
  "observedModelReason": "unverified until smoke",
  "ambient": { "status": "engine-advisory", "evidence": "how the ambient harness was measured" },
  "sandbox": "read-only",
  "timeoutMs": 600000,
  "repeats": 1,
  "interleaveSeed": 20260907
}
```

## Case set (`cases.json`)

30 frozen cases: five routes (`pm`, `dev`, `qc`, `audit`, `close`) x six, each
route **4 dev + 2 heldout** (20 dev / 10 heldout overall). Coverage is
validated, not decorative — the set must include (coverage tags in
`provenance.coverage`):

- normal completion, unauthorized request, legitimate repair / authorized
  exception;
- first-turn and first/resume pairs (`resumePrompt` cases carry a
  `thread_reused` assertion);
- `preset-none` and `preset-standard`, `engine-absent`, `engine-advisory`,
  `engine-blocking`;
- false-pass and wrong-checkout traps.

Smoke is a **derived** selection: exactly 3 existing dev cases tagged
`provenance.smoke` carrying the tags `smoke-readonly-closure-sentinel`,
`smoke-isolated-relative-write`, `smoke-explicit-resume` (Spec A1 smoke
rules). `--split smoke` in Task 2 selects these; case records themselves only
carry `dev` / `heldout` splits — any other split is rejected as unknown.

Fixtures are compact inline JSON (`fixture.files[{path, content}]`), synthetic
by design — they never clone the real AGENTS.md, credentials, or parent
`.mstar` state. Cases asserting writes must run under a `workspace-write`
sandbox override; the global default is `read-only`.

Provenance: cases adapted from
`.cursor/skills/mstar-routing-eval/assets/routing-evals.json` (v27) cite the
seed case id; new cases carry an explicit note. Assertions use mechanical
kinds (`final_contains`, `final_not_contains`, `tool_read_contains`,
`tool_read_not_contains`, `diff_paths_within`, `thread_reused`); semantic
grades still require reviewer rationale at grading time (Task 2+, Spec A1).

## Manifest v1 (output `manifest.json`)

Top-level: `schemaVersion=1`, `plan`, `sourceRefs{baseline,candidate}` (full
SHAs only — branch names / HEAD / short SHAs are rejected as mutable refs),
`cli{path,version,helpHash}`, `requestedModel`/`observedModel` (null + reason
when unavailable — never invented), `configHash` (sha256 over runner-owned
nonsecret config fields), `casesHash` (sha256 of `cases.json` bytes),
`ambient{status,evidence}`, `variants[{id,sourceRef,closure:[{path,sha256}]}]`
(`baseline` and `candidate` resolved from their own refs; `minimal` has an
empty closure and derives from the candidate ref), `cases[]` (id, route,
split, sandbox, fixture hash + per-file sha256, prompt, optional
resumePrompt, assertions, provenance, `integrityHash`), global
`sandbox`/`timeoutMs`/`repeats`/`interleaveSeed`, and `heldoutDigest`.

Immutability discipline: prepare writes the manifest once; `run` must never
mutate it or refresh refs. Cross-arm closure edges (a closure hash that
belongs to the other arm) and stale hashes are rejected at prepare.
`heldoutDigest` versions held-out integrity hashes **before tuning** —
blinding is procedural; a heldout failure ends candidate adoption (Spec A1).

Canonical run ID (consumed by Task 2): `case/variant/repeat/turn`, e.g.
`dev-dev-1-smoke-readonly-closure-sentinel/baseline/1/1`; turn 1 = first
turn, turn >= 2 = resume turns.

## Verification

```bash
bun test scripts/skill-eval/runner.test.ts --test-name-pattern prepare
```

## Task 1 boundaries

No `run`/`report` stages, no model invocations, no grading here. Real
baseline/minimal evidence is a Task 3 gate; unit tests prove scheduler/parser
correctness only, never behavioral success.
