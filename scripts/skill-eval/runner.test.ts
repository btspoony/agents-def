/**
 * scripts/skill-eval/runner.test.ts — plan 20260907-skill-eval-baseline.
 *
 * Task 1 scope: `prepare` behavior of scripts/skill-eval/manifest.ts.
 * Run the prepare suite with:
 *   bun test scripts/skill-eval/runner.test.ts --test-name-pattern prepare
 *
 * All prepare tests use in-memory IO + in-memory source trees, so the tested
 * prepare path performs zero subprocesses (a spy on the single exec seam
 * fails loudly if anything is ever spawned — model calls included). The git
 * argv parsing tests at the bottom use a fake exec and are named so they do
 * NOT match the `prepare` filter (they still run in the full-suite Task 2
 * verification).
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "bun:test";
import {
  canonicalRunId,
  DEV_CASES_PER_ROUTE,
  HELDOUT_CASES_PER_ROUTE,
  makeGitSourceTreeReader,
  MANIFEST_SCHEMA_VERSION,
  prepareManifest,
  ROUTES,
  SMOKE_CASE_COUNT,
  TOTAL_CASES,
  TOTAL_DEV_CASES,
  TOTAL_HELDOUT_CASES,
  validateResolvedManifest,
  validateRunSplit,
  type CaseSplit,
  type EvalManifest,
  type ExecArgv,
  type Io,
  type PrepareConfigInput,
  type SourceTree,
} from "./manifest.ts";

// ---------------------------------------------------------------------------
// Fixtures: in-memory IO, pinned trees, config
// ---------------------------------------------------------------------------

const BASELINE_SHA = "a".repeat(40);
const CANDIDATE_SHA = "b".repeat(40);
const REPO_ROOT = "/repo";
const FIXTURE_ROOT = `${REPO_ROOT}/.tmp/skill-eval`;
const OUT_DIR = `${FIXTURE_ROOT}/runs/run-1`;

const baselineTree: SourceTree = {
  "skills/demo/SKILL.md": sha256Of("baseline demo skill"),
  "skills/demo/refs/a.md": sha256Of("baseline ref a"),
};
const candidateTree: SourceTree = {
  "skills/demo/SKILL.md": sha256Of("candidate demo skill"),
  "skills/demo/refs/a.md": sha256Of("candidate ref a"),
};

function sha256Of(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

const memReader = async (sourceRef: string): Promise<SourceTree> => {
  if (sourceRef === BASELINE_SHA) return baselineTree;
  if (sourceRef === CANDIDATE_SHA) return candidateTree;
  throw new Error(`unknown source ref under test: ${sourceRef}`);
};

const testConfig: PrepareConfigInput = {
  plan: "20260907-skill-eval-baseline",
  sourceRefs: { baseline: BASELINE_SHA, candidate: CANDIDATE_SHA },
  cli: { path: "/opt/homebrew/bin/codex", version: "codex-cli 0.144.1", helpHash: sha256Of("help") },
  requestedModel: null,
  requestedModelReason: "user did not authorize a named-model override; fixed CLI/config only",
  observedModel: null,
  observedModelReason: "unverified until real smoke (Spec A1)",
  ambient: { status: "engine-advisory", evidence: "fixture AGENTS.md files declare advisory mode" },
  sandbox: "read-only",
  timeoutMs: 600000,
  repeats: 1,
  interleaveSeed: 20260907,
};

const CASES_TEXT = readFileSync(resolve(import.meta.dir, "cases.json"), "utf8");

function memoryIo(symlinks: Record<string, string> = {}): {
  io: Io;
  files: Map<string, string>;
  writes: string[];
} {
  const files = new Map<string, string>();
  const dirs = new Set<string>();
  const writes: string[] = [];
  const ensureAncestors = (p: string) => {
    let cur = resolve(p);
    for (;;) {
      dirs.add(cur);
      const parent = resolve(cur, "..");
      if (parent === cur) break;
      cur = parent;
    }
  };
  const io: Io = {
    readText: (p) => {
      const v = files.get(resolve(p));
      if (v === undefined) throw new Error(`ENOENT: ${p}`);
      return v;
    },
    writeText: (p, content) => {
      ensureAncestors(resolve(p, ".."));
      files.set(resolve(p), content);
      writes.push(resolve(p));
    },
    ensureDir: (p) => {
      ensureAncestors(p);
    },
    exists: (p) =>
      files.has(resolve(p)) || dirs.has(resolve(p)) || symlinks[resolve(p)] !== undefined,
    realpath: (p) => {
      let r = resolve(p);
      for (let i = 0; i < 16; i += 1) {
        const target = symlinks[r];
        if (!target) break;
        r = resolve(target);
      }
      return r;
    },
  };
  return { io, files, writes };
}

/** Spy on the ONLY subprocess seam: any call is recorded and fails loudly. */
function makeSubprocessSpy(): { exec: ExecArgv; readonly calls: number } {
  const state = { calls: 0 };
  const exec: ExecArgv = async (file, args) => {
    state.calls += 1;
    throw new Error(`subprocess attempted during prepare test: ${file} ${args.join(" ")}`);
  };
  return {
    exec,
    get calls() {
      return state.calls;
    },
  };
}

function setupMemory(): ReturnType<typeof memoryIo> {
  const mem = memoryIo();
  mem.files.set(resolve("/cfg/config.json"), JSON.stringify(testConfig));
  mem.files.set(resolve("/cfg/cases.json"), CASES_TEXT);
  return mem;
}

function prepareArgs(mem: ReturnType<typeof memoryIo>, spy: { exec: ExecArgv }, overrides: Record<string, unknown> = {}) {
  return {
    configPath: "/cfg/config.json",
    casesPath: "/cfg/cases.json",
    outDir: OUT_DIR,
    repoRoot: REPO_ROOT,
    io: mem.io,
    readSourceTree: memReader,
    exec: spy.exec,
    ...overrides,
  } as Parameters<typeof prepareManifest>[0];
}

function readManifestFile(mem: ReturnType<typeof memoryIo>): EvalManifest {
  return JSON.parse(mem.files.get(resolve(OUT_DIR, "manifest.json"))!) as EvalManifest;
}

function mutatedCasesText(mutator: (cases: (Record<string, unknown> & { fixture: { files: unknown[] } })[]) => void): string {
  const parsed = JSON.parse(CASES_TEXT) as { cases: (Record<string, unknown> & { fixture: { files: unknown[] } })[] };
  mutator(parsed.cases);
  return JSON.stringify(parsed);
}

// ---------------------------------------------------------------------------
// prepare suite (matched by --test-name-pattern prepare)
// ---------------------------------------------------------------------------

describe("prepare — frozen baseline manifest (Task 1)", () => {
  test("prepare accepts the frozen 30-case set: exit 0, dev20/heldout10, per-route dev4/heldout2, exactly 3 smoke dev cases", async () => {
    const mem = setupMemory();
    const spy = makeSubprocessSpy();
    const result = await prepareManifest(prepareArgs(mem, spy));

    expect(result.exit).toBe(0);
    expect(result.errors).toEqual([]);
    expect(result.manifest).toBeDefined();

    const manifest = result.manifest!;
    expect(manifest.schemaVersion).toBe(MANIFEST_SCHEMA_VERSION);
    expect(manifest.cases.length).toBe(TOTAL_CASES);
    expect(manifest.cases.length).toBe(30);
    const dev = manifest.cases.filter((c) => c.split === "dev");
    const heldout = manifest.cases.filter((c) => c.split === "heldout");
    expect(dev.length).toBe(TOTAL_DEV_CASES);
    expect(heldout.length).toBe(TOTAL_HELDOUT_CASES);
    expect(dev.length).toBe(20);
    expect(heldout.length).toBe(10);

    for (const route of ROUTES) {
      const bucket = manifest.cases.filter((c) => c.route === route);
      expect(bucket.filter((c) => c.split === "dev").length).toBe(DEV_CASES_PER_ROUTE);
      expect(bucket.filter((c) => c.split === "heldout").length).toBe(HELDOUT_CASES_PER_ROUTE);
      expect(bucket.length).toBe(DEV_CASES_PER_ROUTE + HELDOUT_CASES_PER_ROUTE);
    }

    const smoke = manifest.cases.filter((c) => c.provenance.smoke === true);
    expect(smoke.length).toBe(SMOKE_CASE_COUNT);
    expect(smoke.every((c) => c.split === "dev")).toBe(true);
    const smokeTags = smoke.flatMap((c) => c.provenance.coverage).filter((t) => t.startsWith("smoke-"));
    expect(new Set(smokeTags).size).toBe(3);

    expect(manifest.variants.map((v) => v.id)).toEqual(["baseline", "candidate", "minimal"]);
    expect(manifest.variants[0].closure.length).toBeGreaterThan(0);
    expect(manifest.variants[2].closure.length).toBe(0);
  });

  test("prepare writes manifest + fixtures only inside the disposable fixture root", async () => {
    const mem = setupMemory();
    const spy = makeSubprocessSpy();
    const result = await prepareManifest(prepareArgs(mem, spy));

    expect(result.exit).toBe(0);
    expect(mem.writes.length).toBeGreaterThan(0);
    for (const path of mem.writes) {
      expect(path.startsWith(`${FIXTURE_ROOT}/`)).toBe(true);
    }
    const manifest = readManifestFile(mem);
    expect(manifest.cases.length).toBe(30);
    // Every case fixture materialized under <out>/fixtures/<caseId>/...
    for (const c of manifest.cases) {
      for (const f of c.fixture.files) {
        expect(mem.files.has(resolve(OUT_DIR, "fixtures", c.id, f.path))).toBe(true);
      }
    }
  });

  test("prepare performs zero subprocess/model calls (subprocess spy count = 0)", async () => {
    const mem = setupMemory();
    const spy = makeSubprocessSpy();
    const result = await prepareManifest(prepareArgs(mem, spy));
    expect(result.exit).toBe(0);
    expect(spy.calls).toBe(0);
  });

  test("prepare is deterministic: identical inputs yield byte-identical manifests", async () => {
    const memA = setupMemory();
    const memB = setupMemory();
    const spy = makeSubprocessSpy();
    const a = await prepareManifest(prepareArgs(memA, spy));
    const b = await prepareManifest(prepareArgs(memB, spy));
    expect(a.exit).toBe(0);
    expect(b.exit).toBe(0);
    expect(JSON.stringify(a.manifest)).toBe(JSON.stringify(b.manifest));
    expect(memA.files.get(resolve(OUT_DIR, "manifest.json"))).toBe(
      memB.files.get(resolve(OUT_DIR, "manifest.json")),
    );
    expect(a.manifest!.heldoutDigest).toBe(b.manifest!.heldoutDigest);
  });

  test("prepare versions heldout hashes before tuning: heldoutDigest reacts only to heldout changes", async () => {
    const spy = makeSubprocessSpy();

    // Baseline run.
    const base = await prepareManifest(prepareArgs(setupMemory(), spy));
    expect(base.exit).toBe(0);

    // Mutate a dev case prompt: dev integrityHash changes, heldoutDigest must not.
    const devMutated = setupMemory();
    devMutated.files.set(
      resolve("/cfg/cases.json"),
      mutatedCasesText((cases) => {
        cases[0].prompt = " mutated dev prompt ";
      }),
    );
    const devRun = await prepareManifest(prepareArgs(devMutated, spy));
    expect(devRun.exit).toBe(0);
    expect(devRun.manifest!.heldoutDigest).toBe(base.manifest!.heldoutDigest);
    expect(devRun.manifest!.cases[0].integrityHash).not.toBe(base.manifest!.cases[0].integrityHash);

    // Mutate a heldout case prompt: heldoutDigest must change.
    const heldoutMutated = setupMemory();
    heldoutMutated.files.set(
      resolve("/cfg/cases.json"),
      mutatedCasesText((cases) => {
        const target = cases.find((c) => c.split === "heldout")!;
        target.prompt = " mutated heldout prompt ";
      }),
    );
    const heldoutRun = await prepareManifest(prepareArgs(heldoutMutated, spy));
    expect(heldoutRun.exit).toBe(0);
    expect(heldoutRun.manifest!.heldoutDigest).not.toBe(base.manifest!.heldoutDigest);
  });

  test("prepare preserves missing model identity as null with explicit reason", async () => {
    const mem = setupMemory();
    const spy = makeSubprocessSpy();
    const result = await prepareManifest(prepareArgs(mem, spy));
    expect(result.exit).toBe(0);
    expect(result.manifest!.requestedModel).toBeNull();
    expect(result.manifest!.requestedModelReason).toBe(testConfig.requestedModelReason);
    expect(result.manifest!.observedModel).toBeNull();
    expect(result.manifest!.observedModelReason).toBe(testConfig.observedModelReason);

    // A user-authorized model passes through without requiring a reason.
    const withModel = setupMemory();
    withModel.files.set(
      resolve("/cfg/config.json"),
      JSON.stringify({ ...testConfig, requestedModel: "gpt-5.1-codex", requestedModelReason: null }),
    );
    const r2 = await prepareManifest(prepareArgs(withModel, spy));
    expect(r2.exit).toBe(0);
    expect(r2.manifest!.requestedModel).toBe("gpt-5.1-codex");
  });

  test("prepare canonical run ID is case/variant/repeat/turn and rejects invalid inputs", () => {
    expect(canonicalRunId("pm-dev-1-plan-before-implement", "baseline", 1, 1)).toBe(
      "pm-dev-1-plan-before-implement/baseline/1/1",
    );
    expect(canonicalRunId("dev-dev-4-resume-repair", "minimal", 2, 2)).toBe("dev-dev-4-resume-repair/minimal/2/2");
    expect(() => canonicalRunId("case", "baseline", 0, 1)).toThrow(/repeat/);
    expect(() => canonicalRunId("case", "baseline", 1, 0)).toThrow(/turn/);
    expect(() => canonicalRunId("case", "nightly", 1, 1)).toThrow(/variant/);
    expect(() => canonicalRunId("Bad_Id", "baseline", 1, 1)).toThrow(/case id/);
  });

  test("prepare rejects mutable refs (branch names / HEAD / short SHA) with exit 2 before any write", async () => {
    for (const badRef of ["main", "HEAD", "ec7cc1b", `${BASELINE_SHA}ffff`]) {
      const mem = setupMemory();
      mem.files.set(
        resolve("/cfg/config.json"),
        JSON.stringify({ ...testConfig, sourceRefs: { baseline: badRef, candidate: CANDIDATE_SHA } }),
      );
      const spy = makeSubprocessSpy();
      const result = await prepareManifest(prepareArgs(mem, spy));
      expect(result.exit).toBe(2);
      expect(result.errors.join("\n")).toContain("mutable or non-full ref");
      expect(mem.writes.length).toBe(0);
    }
  });

  test("prepare rejects escaping fixture paths with exit 2 before any write", async () => {
    for (const badPath of ["../escape.txt", "/etc/passwd", "a/../../b.txt", "dir/./x.txt"]) {
      const mem = setupMemory();
      mem.files.set(
        resolve("/cfg/cases.json"),
        mutatedCasesText((cases) => {
          (cases[0].fixture.files as { path: string; content: string }[])[0].path = badPath;
        }),
      );
      const spy = makeSubprocessSpy();
      const result = await prepareManifest(prepareArgs(mem, spy));
      expect(result.exit).toBe(2);
      expect(result.errors.join("\n")).toContain("escapes the fixture root");
      expect(mem.writes.length).toBe(0);
    }
  });

  test("prepare rejects unknown split with exit 2 before any write", async () => {
    const mem = setupMemory();
    mem.files.set(
      resolve("/cfg/cases.json"),
      mutatedCasesText((cases) => {
        cases[0].split = "smoke" as unknown as CaseSplit; // smoke is derived, never stored
      }),
    );
    const spy = makeSubprocessSpy();
    const result = await prepareManifest(prepareArgs(mem, spy));
    expect(result.exit).toBe(2);
    expect(result.errors.join("\n")).toContain("split unknown");
    expect(mem.writes.length).toBe(0);
  });

  test("prepare rejects duplicate case ids with exit 2 before any write", async () => {
    const mem = setupMemory();
    mem.files.set(
      resolve("/cfg/cases.json"),
      mutatedCasesText((cases) => {
        cases[1].id = cases[0].id as string;
      }),
    );
    const spy = makeSubprocessSpy();
    const result = await prepareManifest(prepareArgs(mem, spy));
    expect(result.exit).toBe(2);
    expect(result.errors.join("\n")).toContain("duplicate case id");
    expect(mem.writes.length).toBe(0);
  });

  test("prepare rejects unsafe real checkout targets with exit 2 before any write", async () => {
    const spy = makeSubprocessSpy();

    // Outside the disposable fixture root entirely.
    const outside = setupMemory();
    const r1 = await prepareManifest(prepareArgs(outside, spy, { outDir: `${REPO_ROOT}/src/main-checkout-run` }));
    expect(r1.exit).toBe(2);
    expect(r1.errors.join("\n")).toContain("unsafe output target");
    expect(outside.writes.length).toBe(0);

    // The fixture root itself is not a valid run dir.
    const rootItself = setupMemory();
    const r2 = await prepareManifest(prepareArgs(rootItself, spy, { outDir: FIXTURE_ROOT }));
    expect(r2.exit).toBe(2);
    expect(rootItself.writes.length).toBe(0);

    // Symlinked run dir escaping the fixture root.
    const escaped = memoryIo({ [`${FIXTURE_ROOT}/escape-link`]: `${REPO_ROOT}/src` });
    escaped.files.set(resolve("/cfg/config.json"), JSON.stringify(testConfig));
    escaped.files.set(resolve("/cfg/cases.json"), CASES_TEXT);
    const r3 = await prepareManifest(
      prepareArgs(escaped, spy, { outDir: `${FIXTURE_ROOT}/escape-link/run` }),
    );
    expect(r3.exit).toBe(2);
    expect(r3.errors.join("\n")).toContain("symlink escape");
    expect(escaped.writes.length).toBe(0);
  });

  test("prepare rejects cross-arm closure edges in the resolved manifest", async () => {
    const mem = setupMemory();
    const spy = makeSubprocessSpy();
    const result = await prepareManifest(prepareArgs(mem, spy));
    expect(result.exit).toBe(0);

    const tampered = JSON.parse(JSON.stringify(result.manifest)) as EvalManifest;
    const baselineVariant = tampered.variants.find((v) => v.id === "baseline")!;
    const entry = baselineVariant.closure.find((e) => e.path === "skills/demo/SKILL.md")!;
    entry.sha256 = sha256Of("candidate demo skill"); // candidate arm's hash

    const errors = await validateResolvedManifest(tampered, memReader);
    expect(errors.join("\n")).toContain("cross-arm closure edge");
  });

  test("prepare rejects stale closure hashes that match no arm", async () => {
    const mem = setupMemory();
    const spy = makeSubprocessSpy();
    const result = await prepareManifest(prepareArgs(mem, spy));
    expect(result.exit).toBe(0);

    const tampered = JSON.parse(JSON.stringify(result.manifest)) as EvalManifest;
    const candidateVariant = tampered.variants.find((v) => v.id === "candidate")!;
    candidateVariant.closure[0].sha256 = sha256Of("hash from neither arm");

    const errors = await validateResolvedManifest(tampered, memReader);
    expect(errors.join("\n")).toContain("stale hash");
  });

  test("prepare rejects an invalid run split name (run CLI contract)", () => {
    expect(validateRunSplit("dev")).toEqual([]);
    expect(validateRunSplit("heldout")).toEqual([]);
    expect(validateRunSplit("smoke")).toEqual([]);
    expect(validateRunSplit("nightly").join(" ")).toContain("unknown split");
  });
});

// ---------------------------------------------------------------------------
// Git argv reader parsing (NOT part of the prepare filter; fake exec only)
// ---------------------------------------------------------------------------

describe("source tree reader (git argv parsing)", () => {
  test("reader uses argv-array git only and hashes cat-file blob bytes", async () => {
    const calls: { file: string; args: string[] }[] = [];
    const fakeExec: ExecArgv = async (file, args) => {
      calls.push({ file, args: [...args] });
      if (args.includes("ls-tree")) {
        return {
          stdout: Buffer.from(
            `100644 blob ${"1".repeat(40)}\tskills/demo/SKILL.md\0` +
              `100644 blob ${"2".repeat(40)}\tskills/demo/refs/a.md\0`,
          ),
        };
      }
      if (args.includes("cat-file")) {
        const spec = args[args.length - 1];
        return { stdout: Buffer.from(`content-of-${spec}`) };
      }
      throw new Error(`unexpected git invocation: ${args.join(" ")}`);
    };

    const reader = makeGitSourceTreeReader(REPO_ROOT, fakeExec);
    const tree = await reader(BASELINE_SHA);

    expect(calls.length).toBe(3);
    expect(calls.every((c) => c.file === "git")).toBe(true);
    expect(calls[0].args).toEqual(["-C", REPO_ROOT, "ls-tree", "-r", "-z", BASELINE_SHA, "--", "skills"]);
    expect(calls[1].args).toEqual(["-C", REPO_ROOT, "cat-file", "blob", `${BASELINE_SHA}:skills/demo/SKILL.md`]);
    expect(Object.keys(tree).sort()).toEqual(["skills/demo/SKILL.md", "skills/demo/refs/a.md"]);
    expect(tree["skills/demo/SKILL.md"]).toBe(sha256Of(`content-of-${BASELINE_SHA}:skills/demo/SKILL.md`));
  });
});
