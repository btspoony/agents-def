/**
 * scripts/skill-eval/closure.test.ts — plan 20260907-skill-load-contract (SP2), Task 1.
 *
 * Structural closure evidence for the skill load contract (Spec A5: "extracts
 * referenced local files/anchors and reports missing/cyclic unconditional
 * edges; route expectations come from case assertions, not an Engine routing
 * platform"). Plan 06 extends THIS test rather than creating a parallel graph
 * checker.
 *
 * What it pins (before-state, HEAD 5d7aab93):
 *  1. Reference integrity — every local file/directory referenced by the
 *     roles hub, its role references, and the shared leaf block resolves on
 *     disk; cross-skill `references/...` mentions resolve too. No cycles in
 *     the unconditional required-read graph.
 *  2. Load-bearing anchors — the AC3 blocks (Completion Report / Git NEVER /
 *     Non-Recursive Dispatch Rule / Shared anti-recursion NEVER in the shared
 *     leaf block; roles Load Order + mapping; core 状态机 Done authority) are
 *     present.
 *  3. Route matrix from Plan 01 cases (scripts/skill-eval/cases.json) —
 *     PM/dev/QC/audit/close x first/resume, none and default(standard)
 *     presets, engine absent/advisory/blocking all covered; each route's
 *     none-closure contains identity chain + role-owned QC/QA obligations;
 *     each route's default preset members exist on disk.
 *  4. Conflict pins (load-inventory.json C1/C2/C3) — exact before-state text
 *     that Task 2 will change, plus the REAL `lintLoadOrder` from
 *     @mstar-harness/engine returning ok for mstar-roles today (treated as an
 *     ordinary topic) and still failing when the mention is stripped (the
 *     lint is substring-strength only).
 *  5. Red fixtures — on a disposable synthetic skill root, a removed
 *     referenced target, a removed anchor heading, and a manufactured cycle
 *     are each reported by the checker (i.e. the suite fails on such real
 *     regressions).
 *
 * Runtime requirements (plan A6): `bun install` and `bun run engine:build`
 * before consumer tests — the engine import resolves @mstar-harness/engine.
 *
 * Run: bun test scripts/skill-eval/closure.test.ts
 * This is STRUCTURAL evidence only — it never substitutes for model traces
 * (Spec A1 runner/efficacy gate separation).
 */
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, describe, expect, test } from "bun:test";
import { lintLoadOrder } from "@mstar-harness/engine";

// ---------------------------------------------------------------------------
// Layout + loading
// ---------------------------------------------------------------------------

const REPO_ROOT = resolve(import.meta.dir, "../..");
const SKILLS_DIR = join(REPO_ROOT, "skills");
const ROLES_DIR = join(SKILLS_DIR, "mstar-roles");
const ROLES_SKILL = join(ROLES_DIR, "SKILL.md");
const LEAF_CORE = join(ROLES_DIR, "references/_shared/leaf-executor-core.md");
const CORE_SKILL = join(SKILLS_DIR, "mstar-harness-core/SKILL.md");
const CASES_JSON = join(REPO_ROOT, "scripts/skill-eval/cases.json");

function read(path: string): string {
  return readFileSync(path, "utf8");
}

// ---------------------------------------------------------------------------
// Reference extraction (pure text -> local targets)
// ---------------------------------------------------------------------------

/** `references/....md` / `references/dir/` mentions that are LOCAL to
 * mstar-roles (not preceded by a `<skill>/` path segment). */
const LOCAL_REF_RE = /(?<!\/)references\/[A-Za-z0-9._/-]+/g;

/** `mstar-X/references/....md` cross-skill mentions. */
const CROSS_SKILL_REF_RE = /mstar-[a-z0-9-]+\/references\/[A-Za-z0-9._/-]+/g;

function extractLocalRefs(text: string): string[] {
  return [...new Set((text.match(LOCAL_REF_RE) ?? []).map((s) => s.replace(/[.,;)\]]+$/, "")))];
}

function extractCrossSkillRefs(text: string): string[] {
  return [...new Set((text.match(CROSS_SKILL_REF_RE) ?? []).map((s) => s.replace(/[.,;)\]]+$/, "")))];
}

/** Role Reference Mapping rows of the roles hub: [agentId, reference]. */
function parseRoleMapping(rolesText: string): Array<{ agentId: string; reference: string }> {
  const rows: Array<{ agentId: string; reference: string }> = [];
  for (const line of rolesText.split(/\r?\n/)) {
    const m = /^\|\s*`([a-z0-9-]+)`\s*\|\s*`(references\/[a-z0-9.-]+\.md)`\s*\|/.exec(line);
    if (m) rows.push({ agentId: m[1], reference: m[2] });
  }
  return rows;
}

/** Every existing `mstar-X/references/...` path under a skills root. Short
 * form `references/...` mentions that are not local to mstar-roles resolve
 * against this index (role texts say e.g. "`mstar-host` ->
 * `references/opencode.md`"). */
function corpusReferenceIndex(corpusRoot: string): Set<string> {
  const index = new Set<string>();
  if (!existsSync(corpusRoot)) return index;
  const walk = (dir: string, skillName: string, rel: string): void => {
    for (const entry of readdirSync(dir)) {
      const abs = join(dir, entry);
      const relPath = rel === "" ? entry : `${rel}/${entry}`;
      if (statSync(abs).isDirectory()) walk(abs, skillName, relPath);
      else index.add(`${skillName}/references/${relPath}`);
    }
  };
  for (const skill of readdirSync(corpusRoot)) {
    if (!skill.startsWith("mstar-")) continue;
    const refsDir = join(corpusRoot, skill, "references");
    if (existsSync(refsDir)) walk(refsDir, skill, "");
  }
  return index;
}

// ---------------------------------------------------------------------------
// Unconditional required-read graph
// ---------------------------------------------------------------------------

type ClosureReport = {
  missingTargets: string[];
  missingAnchors: string[];
  cycles: string[][];
  /** node -> direct unconditional targets (for closure assertions) */
  edges: Map<string, string[]>;
};

const LOAD_BEARING_ANCHORS: Array<{ file: string; heading: string; why: string }> = [
  { file: "references/_shared/leaf-executor-core.md", heading: "## Git NEVER (repo writes)", why: "AC3 repo-write discipline reachable under none" },
  { file: "references/_shared/leaf-executor-core.md", heading: "## Plan & Documentation Rules", why: "AC3 plan/done boundaries reachable under none" },
  { file: "references/_shared/leaf-executor-core.md", heading: "## Non-Recursive Dispatch Rule (shared shape)", why: "AC3 nondelegation reachable under none" },
  { file: "references/_shared/leaf-executor-core.md", heading: "## Shared anti-recursion NEVER", why: "AC3 anti-recursion reachable under none" },
  { file: "SKILL.md", heading: "## Load Order", why: "roles hub bootstrap section" },
  { file: "SKILL.md", heading: "## Role Reference Mapping", why: "roles hub identity mapping" },
];

function buildGraph(rootDir: string): ClosureReport {
  const rolesSkillPath = join(rootDir, "SKILL.md");
  const rolesText = read(rolesSkillPath);
  const mapping = parseRoleMapping(rolesText);
  const corpus = corpusReferenceIndex(join(rootDir, ".."));
  const edges = new Map<string, string[]>();
  const missingTargets: string[] = [];
  const cycles: string[][] = [];

  const addEdge = (from: string, to: string) => {
    const list = edges.get(from) ?? [];
    if (!list.includes(to)) list.push(to);
    edges.set(from, list);
  };

  // Identity edges: roles hub -> every mapped reference (unconditional).
  edges.set("SKILL.md", []);
  for (const { reference } of mapping) {
    const abs = join(rootDir, reference);
    if (!existsSync(abs)) missingTargets.push(`mstar-roles/${reference} (mapped from SKILL.md)`);
    addEdge("SKILL.md", reference);
  }
  // Cross-skill mentions from the hub itself (existence checks only).
  for (const cross of extractCrossSkillRefs(rolesText)) {
    if (!existsSync(join(SKILLS_DIR, cross))) {
      missingTargets.push(`${cross} (cross-skill, referenced by SKILL.md)`);
    }
  }

  // Role-owned edges: every local references/... mention inside a mapped
  // reference file is unconditional (role-owned files always load).
  for (const { agentId, reference } of mapping) {
    const abs = join(rootDir, reference);
    if (!existsSync(abs)) continue;
    const text = read(abs);
    edges.set(reference, edges.get(reference) ?? []);
    for (const ref of extractLocalRefs(text)) {
      const absTarget = join(rootDir, ref);
      if (existsSync(absTarget)) {
        // role-owned edge: local mentions always load with the reference
        addEdge(reference, ref);
        continue;
      }
      // Short-form mention of another skill's reference (e.g.
      // "`mstar-host` -> `references/opencode.md`"): resolvable anywhere in
      // the corpus counts as intact; nowhere = missing.
      const corpusHit = [...corpus].some((p) => p.endsWith(`/${ref}`));
      if (!corpusHit) {
        missingTargets.push(`mstar-roles/${ref} (referenced by ${reference} [${agentId}]) — no local or corpus match`);
      }
    }
    for (const cross of extractCrossSkillRefs(text)) {
      const absCross = join(SKILLS_DIR, cross);
      if (!existsSync(absCross)) missingTargets.push(`${cross} (cross-skill, referenced by ${reference} [${agentId}])`);
    }
  }

  // The unconditional core-first edge of the shared leaf block (conflict C3).
  const leafRel = "references/_shared/leaf-executor-core.md";
  const leafPath = join(rootDir, leafRel);
  if (existsSync(leafPath)) {
    const coreRel = "../mstar-harness-core/SKILL.md";
    if (!existsSync(join(rootDir, coreRel))) missingTargets.push(`mstar-harness-core/SKILL.md (required by ${leafRel})`);
    else addEdge(leafRel, "../mstar-harness-core/SKILL.md");
  }

  // Anchor checks.
  const missingAnchors: string[] = [];
  for (const { file, heading, why } of LOAD_BEARING_ANCHORS) {
    const abs = join(rootDir, file);
    if (!existsSync(abs)) continue; // already reported as missing target
    if (!read(abs).includes(heading)) missingAnchors.push(`${file}: missing "${heading}" (${why})`);
  }

  // Cycle detection (DFS over unconditional edges).
  const state = new Map<string, number>();
  const stack: string[] = [];
  const visit = (node: string) => {
    const s = state.get(node) ?? 0;
    if (s === 1) {
      const start = stack.indexOf(node);
      cycles.push([...stack.slice(start === -1 ? 0 : start), node]);
      return;
    }
    if (s === 2) return;
    state.set(node, 1);
    stack.push(node);
    for (const next of edges.get(node) ?? []) visit(next);
    stack.pop();
    state.set(node, 2);
  };
  for (const node of edges.keys()) visit(node);

  return { missingTargets, missingAnchors, cycles, edges };
}

/** Reachable closure following unconditional edges from the identity chain. */
function closureOf(report: ClosureReport, entryPoints: string[]): Set<string> {
  const seen = new Set<string>();
  const queue = [...entryPoints];
  while (queue.length > 0) {
    const node = queue.shift() as string;
    if (seen.has(node)) continue;
    seen.add(node);
    for (const next of report.edges.get(node) ?? []) queue.push(next);
  }
  return seen;
}

// ---------------------------------------------------------------------------
// Real-repo inputs (loaded once)
// ---------------------------------------------------------------------------

const rolesText = read(ROLES_SKILL);
const leafText = read(LEAF_CORE);
const coreText = read(CORE_SKILL);
const mapping = parseRoleMapping(rolesText);

type EvalCase = {
  id: string;
  route: string;
  split: string;
  fixture: { files: Array<{ path: string; content: string }> };
  prompt: string;
  resumePrompt?: string;
};
const cases = (JSON.parse(read(CASES_JSON)) as { schemaVersion: number; cases: EvalCase[] }).cases;

function agentsMdOf(c: EvalCase): string {
  return c.fixture.files.find((f) => f.path === "AGENTS.md")?.content ?? "";
}
function presetOf(c: EvalCase): "none" | "standard" | "unknown" {
  const m = /Skill presets:\s*([^\n]+)/.exec(agentsMdOf(c));
  if (!m) return "unknown";
  if (/\bnone\b/.test(m[1])) return "none";
  if (/\bstandard\b/.test(m[1])) return "standard";
  return "unknown";
}
function engineOf(c: EvalCase): "absent" | "advisory" | "blocking" | "unspecified" {
  const m = /Engine:\s*([^\n]+)/.exec(agentsMdOf(c));
  if (!m) return "unspecified";
  if (/\babsent\b/.test(m[1])) return "absent";
  if (/\badvisory\b/.test(m[1])) return "advisory";
  if (/\bblocking\b/.test(m[1])) return "blocking";
  return "unspecified";
}

const ROUTES = ["pm", "dev", "qc", "audit", "close"] as const;
const ROUTE_ROLE_REF: Record<(typeof ROUTES)[number], string> = {
  pm: "references/project-manager.md",
  dev: "references/fullstack-dev-shared.md",
  qc: "references/qc-specialist-shared.md",
  audit: "references/code-reviewer.md",
  close: "references/project-manager.md",
};
/** Role-owned files that must be reachable under none (per route class). */
const ROLE_OWNED_UNDER_NONE: Record<(typeof ROUTES)[number], string[]> = {
  pm: ["references/project-manager/qa-trigger-matrix.md"],
  dev: [],
  qc: [
    "references/qc-specialist/reviewer-workflow.md",
    "references/qc-specialist/reviewer-checklist.md",
    "references/qc-specialist/report-template.md",
  ],
  audit: [],
  close: [],
};
/** Default(standard) preset members per route — structural existence only. */
const DEFAULT_PRESET_MEMBERS: Record<(typeof ROUTES)[number], string[]> = {
  pm: ["mstar-dispatch-gates", "mstar-phase-gates", "mstar-conventions"],
  dev: ["mstar-coding-behavior", "mstar-dispatch-gates", "mstar-branch-worktree"],
  qc: ["mstar-branch-worktree", "mstar-artifacts"],
  audit: ["mstar-sdd", "mstar-audit", "mstar-conventions", "mstar-artifacts"],
  close: ["mstar-artifacts", "mstar-iteration"],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("skill load closure — plan 20260907-skill-load-contract Task 1", () => {
  const realGraph = buildGraph(ROLES_DIR);

  afterAll(() => {
    // no persistent writes; temp fixtures clean up after themselves
  });

  test("reference integrity: no missing local/cross-skill targets, no anchor gaps, no cycles in the unconditional graph", () => {
    expect(realGraph.missingTargets).toEqual([]);
    expect(realGraph.missingAnchors).toEqual([]);
    expect(realGraph.cycles).toEqual([]);
  });

  test("roles hub maps all 14 agent ids and every mapped reference exists", () => {
    expect(mapping.length).toBe(14);
    for (const { agentId, reference } of mapping) {
      expect(existsSync(join(ROLES_DIR, reference)), `${agentId} -> ${reference}`).toBe(true);
    }
    // shared families stay on one shared reference file
    const refOf = (id: string) => mapping.find((m) => m.agentId === id)?.reference;
    expect(refOf("fullstack-dev")).toBe(refOf("fullstack-dev-2"));
    expect(refOf("qc-specialist")).toBe(refOf("qc-specialist-2"));
    expect(refOf("qc-specialist-3")).toBe(refOf("qc-specialist-2"));
  });

  test("AC3 anchors: load-bearing blocks of the shared leaf block and hubs are present", () => {
    for (const heading of [
      "## Completion Report",
      "## Git NEVER (repo writes)",
      "## Plan & Documentation Rules",
      "## Non-Recursive Dispatch Rule (shared shape)",
      "## Shared anti-recursion NEVER",
    ]) {
      expect(leafText.includes(heading), `leaf-executor-core.md ${heading}`).toBe(true);
    }
    expect(coreText.includes("## 状态机")).toBe(true);
    expect(coreText.includes("仅 `@project-manager` 或 `@qa-engineer`")).toBe(true);
  });

  test("case route matrix: 5 routes x first/resume, none + default present, engine absent/advisory/blocking present", () => {
    expect(cases.length).toBe(30);
    for (const route of ROUTES) {
      const routeCases = cases.filter((c) => c.route === route);
      expect(routeCases.length, `route ${route} case count`).toBe(6);
      expect(routeCases.some((c) => c.resumePrompt !== undefined), `route ${route} has a resume case`).toBe(true);
      expect(routeCases.some((c) => presetOf(c) === "standard"), `route ${route} has a default/standard case`).toBe(true);
    }
    const noneCases = cases.filter((c) => presetOf(c) === "none");
    expect(noneCases.length).toBeGreaterThanOrEqual(2);
    expect(new Set(noneCases.map((c) => c.route)).size).toBeGreaterThanOrEqual(2);
    for (const engine of ["absent", "advisory", "blocking"] as const) {
      expect(cases.some((c) => engineOf(c) === engine), `engine ${engine} covered`).toBe(true);
    }
    // splits stay per Plan 01 contract: dev4 + heldout2 per route
    for (const route of ROUTES) {
      const routeCases = cases.filter((c) => c.route === route);
      expect(routeCases.filter((c) => c.split === "dev").length, `${route} dev`).toBe(4);
      expect(routeCases.filter((c) => c.split === "heldout").length, `${route} heldout`).toBe(2);
    }
  });

  test("none closure: identity chain + role-owned QC/QA obligations reachable for every route", () => {
    for (const route of ROUTES) {
      const closure = closureOf(realGraph, ["SKILL.md", ROUTE_ROLE_REF[route]]);
      expect(closure.has(ROUTE_ROLE_REF[route]), `${route} role reference reachable`).toBe(true);
      expect(closure.has("references/_shared/leaf-executor-core.md"), `${route} leaf boundary reachable`).toBe(true);
      for (const owned of ROLE_OWNED_UNDER_NONE[route]) {
        expect(closure.has(owned), `${route} role-owned ${owned} reachable under none`).toBe(true);
      }
    }
  });

  test("before-state pin (C3): the none closure is forced through mstar-harness-core via the leaf core-first edge", () => {
    // Task 2 intentionally flips this: roles hub bootstrap becomes the single
    // exception so `none` is coherent WITHOUT the forced core read, while the
    // AC3 leaf semantics stay reachable under none.
    expect(leafText.includes("**Read `mstar-harness-core` first.**")).toBe(true);
    const qcClosure = closureOf(realGraph, ["SKILL.md", ROUTE_ROLE_REF.qc]);
    expect(qcClosure.has("../mstar-harness-core/SKILL.md")).toBe(true);
  });

  test("default preset members exist on disk for every route", () => {
    for (const route of ROUTES) {
      for (const skill of DEFAULT_PRESET_MEMBERS[route]) {
        expect(existsSync(join(SKILLS_DIR, skill, "SKILL.md")), `${route} preset member ${skill}`).toBe(true);
      }
    }
  });

  test("conflict pin (C1): core universal-read rule vs roles none sentence — both exact texts present", () => {
    expect(coreText.includes("凡 **`mstar-*`**（`name` ≠ `mstar-harness-core`）假定读者**已 Read 本 skill**。")).toBe(true);
    expect(coreText.includes("**仅读专题、未读核心** → 未完成 harness 加载。")).toBe(true);
    expect(rolesText.includes("explicit `Skill presets: none` (or a trivial route) ⇒ execute from identity + assignment alone without topic skills")).toBe(true);
    // the roles hub's own Load Order mentions core only conditionally
    expect(rolesText.includes("Whenever `mstar-harness-core` is loaded, it remains the global entry")).toBe(true);
  });

  test("conflict pin (C2): real lintLoadOrder passes mstar-roles today (ordinary-topic treatment) and is substring-strength", () => {
    // Before-state: the real engine lint returns ok for the roles hub.
    const rolesOnly = lintLoadOrder({ "mstar-roles": rolesText });
    expect(rolesOnly.ok).toBe(true);
    expect(rolesOnly.violations).toEqual([]);
    // Strength proof: strip the conditional core mention from the roles Load
    // Order section — the lint STILL passes while any other mention remains
    // inside the section ("If any conflict appears, ..."), i.e. its pass
    // condition is a substring mention (roles.ts:334 section.includes), not a
    // core-first declaration.
    const stripWhenever = rolesText.replace(
      "Whenever `mstar-harness-core` is loaded, it remains the global entry (state machine, gates, routing).",
      "",
    );
    expect(stripWhenever).not.toBe(rolesText);
    expect(lintLoadOrder({ "mstar-roles": stripWhenever }).ok).toBe(true);
    // only once EVERY core mention is gone does the lint report the violation
    const stripAll = stripWhenever.replace(
      "If any conflict appears, `mstar-harness-core` remains the authoritative source for lifecycle, gates, routing, and invariants.",
      "",
    );
    expect(stripAll).not.toBe(stripWhenever);
    const strippedLint = lintLoadOrder({ "mstar-roles": stripAll });
    expect(strippedLint.ok).toBe(false);
    expect(strippedLint.violations.map((v) => v.code)).toContain("roles.loadorder.core.missing");
  });
});

// ---------------------------------------------------------------------------
// Red fixtures — the checker must FAIL on removed targets/anchors and cycles
// ---------------------------------------------------------------------------

describe("closure checker red fixtures (synthetic root)", () => {
  const tmpRootParent = mkdtempSync(join(tmpdir(), "skill-closure-red-"));
  const fixtureRoot = join(tmpRootParent, "mstar-roles");

  function materialize(): void {
    mkdirSync(join(fixtureRoot, "references/_shared"), { recursive: true });
    writeFileSync(
      join(fixtureRoot, "SKILL.md"),
      [
        "## Load Order",
        "",
        "Read `mstar-harness-core` first, then resolve the mapping below.",
        "",
        "## Role Reference Mapping",
        "",
        "| Agent id | Reference file |",
        "| --- | --- |",
        "| `alpha` | `references/alpha.md` |",
        "| `beta` | `references/beta.md` |",
        "",
      ].join("\n"),
    );
    writeFileSync(
      join(fixtureRoot, "references/alpha.md"),
      "Role alpha. Shared blocks -> `references/_shared/leaf-executor-core.md`\n",
    );
    writeFileSync(
      join(fixtureRoot, "references/beta.md"),
      "Role beta. Shared blocks -> `references/_shared/leaf-executor-core.md`\n",
    );
    writeFileSync(
      join(fixtureRoot, "references/_shared/leaf-executor-core.md"),
      "# Leaf Executor Core\n\n**Read `mstar-harness-core` first.**\n\n## Git NEVER (repo writes)\n\nnever\n\n## Plan & Documentation Rules\n\nrules\n\n## Non-Recursive Dispatch Rule (shared shape)\n\nrule\n\n## Shared anti-recursion NEVER\n\nnever\n",
    );
    // the leaf's core-first edge needs the sibling skill to exist
    mkdirSync(join(fixtureRoot, "../mstar-harness-core"), { recursive: true });
    writeFileSync(join(fixtureRoot, "../mstar-harness-core/SKILL.md"), "# core\n");
  }

  test("positive control: the synthetic fixture itself passes the checker", () => {
    materialize();
    const report = buildGraph(fixtureRoot);
    expect(report.missingTargets).toEqual([]);
    expect(report.missingAnchors).toEqual([]);
    expect(report.cycles).toEqual([]);
  });

  test("RED: removing a referenced target is reported (suite fails on such a regression)", () => {
    rmSync(join(fixtureRoot, "references/beta.md"));
    const report = buildGraph(fixtureRoot);
    expect(report.missingTargets.length).toBe(1);
    expect(report.missingTargets[0]).toContain("references/beta.md");
    // restore for the next fixture
    writeFileSync(join(fixtureRoot, "references/beta.md"), "Role beta. Shared blocks -> `references/_shared/leaf-executor-core.md`\n");
  });

  test("RED: removing a load-bearing anchor heading is reported", () => {
    const leafPath = join(fixtureRoot, "references/_shared/leaf-executor-core.md");
    writeFileSync(leafPath, read(leafPath).replace("## Shared anti-recursion NEVER\n", "## Renamed Section\n"));
    const report = buildGraph(fixtureRoot);
    expect(report.missingAnchors.some((a) => a.includes("Shared anti-recursion NEVER"))).toBe(true);
    // restore
    writeFileSync(
      leafPath,
      read(leafPath).replace("## Renamed Section\n", "## Shared anti-recursion NEVER\n"),
    );
  });

  test("RED: a manufactured unconditional cycle is reported", () => {
    writeFileSync(
      join(fixtureRoot, "references/alpha.md"),
      "Role alpha -> `references/beta.md`\n",
    );
    writeFileSync(
      join(fixtureRoot, "references/beta.md"),
      "Role beta -> `references/alpha.md`\n",
    );
    const report = buildGraph(fixtureRoot);
    expect(report.cycles.length).toBeGreaterThan(0);
  });

  afterAll(() => {
    rmSync(tmpRootParent, { recursive: true, force: true });
  });
});
