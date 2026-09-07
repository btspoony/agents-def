/**
 * scripts/skill-eval/index.ts — canonical CLI dispatcher for the skill-eval
 * baseline harness.
 *
 * bun scripts/skill-eval/index.ts prepare --config <absolute-config.json> --out <absolute-run-dir>
 * bun scripts/skill-eval/index.ts run --manifest <absolute-manifest.json> --split smoke|dev|heldout \
 * --variants baseline[,candidate[,minimal]] --repeats 1|3
 * bun scripts/skill-eval/index.ts report --manifest <absolute-manifest.json>
 *
 * `prepare` performs zero model calls and delegates to the Task 1 manifest
 * exports unchanged. `run` executes the frozen manifest through argv-array
 * subprocesses with evidence capture and a resumable scheduler (Task 2
 * runner.ts). `report` aggregates recorded evidence into JSON + Markdown and
 * never reruns a model (Task 2 report.ts).
 *
 * Exit conventions (Spec A1): prepare 0|2; run/report 0 = all requested
 * verified passes, 1 = completed assertion failures, 2 = infrastructure
 * failure, unverified required evidence, or pending units; usage errors = 2.
 */
import { isAbsolute, join, resolve } from "node:path";
import { prepareManifest } from "./manifest.ts";
import { runManifest, type RunResult } from "./runner.ts";
import { buildReport, type ReportResult } from "./report.ts";

function usage(): string {
  return [
    "usage:",
    "  bun scripts/skill-eval/index.ts prepare --config <absolute-config.json> --out <absolute-run-dir> [--repo-root <dir>]",
    "  bun scripts/skill-eval/index.ts run --manifest <absolute-manifest.json> --split smoke|dev|heldout --variants baseline[,candidate[,minimal]] --repeats 1|3",
    "  bun scripts/skill-eval/index.ts report --manifest <absolute-manifest.json>",
  ].join("\n");
}

interface ParsedArgs {
  values: Record<string, string>;
  errors: string[];
}

function parseArgs(argv: readonly string[], allowed: readonly string[]): ParsedArgs {
  const values: Record<string, string> = {};
  const errors: string[] = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const name = arg.slice(2);
      if (!allowed.includes(name)) {
        errors.push(`unknown argument: ${arg}`);
        continue;
      }
      const value = argv[++i];
      if (value === undefined || value.startsWith("--")) {
        errors.push(`missing value for --${name}`);
        continue;
      }
      values[name] = value;
    } else {
      errors.push(`unexpected positional argument: ${arg}`);
    }
  }
  return { values, errors };
}

function requireValues(parsed: ParsedArgs, required: readonly string[]): string[] {
  const errors = [...parsed.errors];
  for (const name of required) {
    if (!parsed.values[name]) errors.push(`--${name} is required`);
  }
  return errors;
}

async function runPrepare(argv: readonly string[]): Promise<number> {
  const parsed = parseArgs(argv, ["config", "out", "repo-root"]);
  const errors = requireValues(parsed, ["config", "out"]);
  if (errors.length > 0) {
    for (const e of errors) process.stderr.write(`error: ${e}\n`);
    return 2;
  }
  const repoRoot = resolve(parsed.values["repo-root"] ?? process.cwd());
  const result = await prepareManifest({
    configPath: resolve(repoRoot, parsed.values["config"]),
    casesPath: join(repoRoot, "scripts", "skill-eval", "cases.json"),
    outDir: parsed.values["out"],
    repoRoot,
  });
  if (result.exit !== 0) {
    for (const e of result.errors) process.stderr.write(`error: ${e}\n`);
    process.stderr.write("prepare rejected the input; nothing was written\n");
    return 2;
  }
  const manifest = result.manifest!;
  const dev = manifest.cases.filter((c) => c.split === "dev").length;
  const heldout = manifest.cases.filter((c) => c.split === "heldout").length;
  process.stdout.write(
    `prepare ok: ${manifest.cases.length} cases (dev ${dev}/heldout ${heldout}), heldoutDigest ${manifest.heldoutDigest}\n` +
      `manifest: ${result.manifestPath}\n` +
      `fixtures: ${result.manifestPath!.replace(/manifest\.json$/, "fixtures")}\n` +
      "zero model calls were made\n",
  );
  return 0;
}

function printRunSummary(result: RunResult): void {
  const g = result.summary.grades;
  process.stdout.write(
    `run finished: exit ${result.exit} — requested ${result.summary.requestedUnits} units ` +
      `(executed ${result.summary.executedUnits}, skipped already-graded ${result.summary.skippedCompletedUnits}, spawns ${result.summary.spawnCount}); ` +
      `pass=${g.pass} fail=${g.fail} unverified=${g.unverified} infrastructure_error=${g.infrastructure_error} pending=${g.pending}\n` +
      `scheduler state: ${result.statePath}\n` +
      "exit 0 = all requested verified passes; 1 = completed assertion failures; 2 = infrastructure/unverified/pending (Spec A1)\n",
  );
}

async function runRun(argv: readonly string[]): Promise<number> {
  const parsed = parseArgs(argv, ["manifest", "split", "variants", "repeats"]);
  const errors = requireValues(parsed, ["manifest", "split", "variants", "repeats"]);
  const variants = (parsed.values["variants"] ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter((v) => v !== "");
  if (variants.length === 0) errors.push("--variants must name at least one variant (comma-separated)");
  const repeats = Number(parsed.values["repeats"]);
  if (parsed.values["repeats"] !== undefined && (!Number.isInteger(repeats) || repeats <= 0)) {
    errors.push(`--repeats must be a positive integer, got ${JSON.stringify(parsed.values["repeats"])}`);
  }
  if (errors.length > 0) {
    for (const e of errors) process.stderr.write(`error: ${e}\n`);
    return 2;
  }
  const manifestPath = resolve(parsed.values["manifest"]);
  if (!isAbsolute(parsed.values["manifest"])) {
    process.stderr.write(`note: --manifest resolved against process.cwd(); Spec A1 usage passes an absolute path\n`);
  }
  const result = await runManifest({
    manifestPath,
    split: parsed.values["split"] as "smoke" | "dev" | "heldout",
    variants,
    repeats,
  });
  if (result.errors.length > 0) {
    for (const e of result.errors) process.stderr.write(`error: ${e}\n`);
  }
  printRunSummary(result);
  return result.exit;
}

function printReportSummary(result: ReportResult): void {
  const g = result.report.grades;
  process.stdout.write(
    `report written (exit ${result.exit}): requested ${result.report.denominator.requestedUnits}, ` +
      `pass=${g.pass} fail=${g.fail} unverified=${g.unverified} infrastructure_error=${g.infrastructure_error} pending=${g.pending}\n` +
      `json: ${result.jsonPath}\nmarkdown: ${result.mdPath}\n` +
      "the report never reruns a model\n",
  );
}

async function runReport(argv: readonly string[]): Promise<number> {
  const parsed = parseArgs(argv, ["manifest"]);
  const errors = requireValues(parsed, ["manifest"]);
  if (errors.length > 0) {
    for (const e of errors) process.stderr.write(`error: ${e}\n`);
    return 2;
  }
  const result = buildReport({ manifestPath: resolve(parsed.values["manifest"]) });
  if (result.errors.length > 0) {
    for (const e of result.errors) process.stderr.write(`error: ${e}\n`);
  } else {
    printReportSummary(result);
  }
  return result.exit;
}

async function main(): Promise<number> {
  const [command, ...rest] = process.argv.slice(2);
  switch (command) {
    case "prepare":
      return runPrepare(rest);
    case "run":
      return runRun(rest);
    case "report":
      return runReport(rest);
    default:
      process.stderr.write(`${usage()}\n`);
      return 2;
  }
}

if (import.meta.main) {
  main().then(
    (code) => process.exit(code),
    (error) => {
      process.stderr.write(`skill-eval crashed: ${(error as Error).stack ?? String(error)}\n`);
      process.exit(2);
    },
  );
}
