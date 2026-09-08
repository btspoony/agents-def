/**
 * mstar-gates — omp `tool_call` pre-hook: blocking enforcement gate for
 * harness coordination-document writes and task dispatches.
 *
 * Loaded by omp as a plugin extension module at session startup (one module,
 * one handler — registration order within a module is stable). The factory
 * registers exactly ONE `tool_call` handler; the handler returns
 * `{ block: true, reason }` ONLY when `Enforcement: hard` governs the event
 * (repo-level `.mstarc`/compass `enforcement: hard`, or the Assignment-header
 * `Enforcement: hard` per dispatch entry) AND engine validation produced
 * violations. Soft-mode dispatch violations are warn-logged through the
 * extension logger (opencode parity — the pre-#156 silent drop is why the
 * self-type/empty-binding pincer stayed latent for five iterations); soft
 * coordination-write violations stay a silent pass. Everything else returns
 * `undefined`.
 *
 * Gate 1 (writes) targets the three v3 coordination documents (compass
 * ruling 7 — hard cutover): the v2 root `{HARNESS_DIR}/status.json`,
 * workflow snapshots `{HARNESS_DIR}/workflows/<id>/snapshot.json` and
 * project registers `{HARNESS_DIR}/projects/<id>/residuals.json`.
 *
 * Gate-1 core lives in the engine (`@mstar-harness/engine` `gates` module
 * — target classification, content/edit validation, reason formatting;
 * contract D1, plan 20260908-hooks-cross-host): omp imports the shared
 * glue, and so does the ZCode write gate — one classification path, no
 * per-host hand copies. The engine is INLINED into this bundle at build
 * (no bare `@mstar-harness/engine` import survives; asserted by the
 * bundle smoke), so the former lazy loaders for the P1 validators and dir
 * resolvers are removed: a stale engine dist now FAILS the omp build
 * instead of silently degrading (versioned divergence, changelogged) — a
 * strictly safer failure.
 *
 * Hard invariant — NEVER throw, NEVER block on failure: omp fails CLOSED
 * (`{ block: true, reason: "Extension <path> failed: …" }`) when a handler
 * throws or times out, so the handler catches every unexpected error and
 * degrades to a silent pass. A broken engine import or a malformed event
 * passes — hard-gate opt-in is per compass / Assignment, never global, and
 * Invalid JSON
 * in write content is NOT a silent pass: Gate 1 reports it as
 * `status.invalid-json` (same shape as the engine's own unparseable-file
 * violation), which can block under a hard compass. A content-less write to
 * a gated document that does not exist yet (fresh scaffold/init) passes
 * silently, mirroring opencode `validateStatusWrite`'s existsSync guard.
 * Size guard ( extended per S-d): content strings beyond
 * ~2MB AND on-disk gated documents beyond ~2MB (the edit path, which carries
 * no content string) are skipped without parsing — a pathologically large
 * write must not approach omp's 30s handler timeout (fail-CLOSED in soft
 * mode); the oversized write/edit passes silently (documented degradation,
 * same as other content-glue limits).
 *
 * No semantic fork: every rule check is an engine call (the gates module's
 * shared classification/validation/reason-formatting path,
 * dispatch.composeDispatchGate —
 * the single shared host dispatch-gate composition —
 * status.resolveRepoEnforcement …). Local
 * code is shape-guards (task wire-shape
 * extraction) and the host-supplied skill pointer — the same composition
 * `packages/opencode/src/mstar.ts`
 * `validateStatusWrite` / `validateDispatchAssignment` uses, with omp's
 * `{ block, reason }` refusal channel instead of the log channel.
 */
import { resolve } from "node:path";
import {
  eventTargetPaths,
  formatStatusWriteBlockReason,
  harnessDocKindOfTarget,
  isReadOnlyAssignmentRole,
  parseAssignmentFields,
  resolveHarnessDir,
  resolveRepoEnforcement,
  validateStatusWriteDoc,
  violationLine,
} from "@mstar-harness/engine";
import type { ValidationResult } from "@mstar-harness/engine";
import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";

const STATUS_SKILL_POINTER = "skill: mstar-artifacts/references/status-and-residuals.md";
const DISPATCH_SKILL_POINTER = "skill: mstar-dispatch-gates";

// ---------------------------------------------------------------------------
// Dispatch wire shapes (spike Q3): flat `{name?, agent?, task?, …}` AND batch
// `{context, tasks: [{name?, agent?, task?, …}]}` — both handled.
// ---------------------------------------------------------------------------

type DispatchEntry = { name: string; agent: string; task: string };

/** Extract dispatch entries from a `task` tool event input (both wire shapes). */
function taskDispatchEntries(input: unknown): DispatchEntry[] {
  if (typeof input !== "object" || input === null) return [];
  const record = input as Record<string, unknown>;
  const toEntry = (raw: unknown): DispatchEntry | null => {
    if (typeof raw !== "object" || raw === null) return null;
    const entry = raw as Record<string, unknown>;
    return {
      name: typeof entry.name === "string" ? entry.name : "",
      agent: typeof entry.agent === "string" ? entry.agent : "",
      task: typeof entry.task === "string" ? entry.task : "",
    };
  };
  if (Array.isArray(record.tasks)) {
    const entries: DispatchEntry[] = [];
    for (const raw of record.tasks) {
      const entry = toEntry(raw);
      if (entry !== null) entries.push(entry);
    }
    return entries;
  }
 // Flat form: the input itself is the entry (`input.task` single string).
  const flat = toEntry(record);
  return flat !== null && flat.task !== "" ? [flat] : [];
}

// ---------------------------------------------------------------------------
// Gate 1 — coordination-document writes (engine gates module)
// ---------------------------------------------------------------------------

/**
 * Block a `write`/`edit` tool_call when it targets a canonical
 * `{HARNESS_DIR}` coordination document (v2 root status.json / workflow
 * snapshot / project register) with violations and the harness compass
 * declares `enforcement: hard`. Soft (or no compass) → silent pass.
 *
 * Classification + validation run through the shared engine `gates`
 * module (contract D1) — the same path the ZCode write gate consumes.
 */
function gateStatusWrite(eventInput: unknown): { block: true; reason: string } | undefined {
  const input = eventInput as Record<string, unknown>;
  for (const rawPath of eventTargetPaths(input)) {
    const target = harnessDocKindOfTarget(rawPath);
    if (target === null) continue; // not a gated coordination write — silent pass
    const violations = validateStatusWriteDoc(input.content, resolve(rawPath), target.kind);
    if (violations.length === 0) continue;
    const enforcement = resolveRepoEnforcement(target.harnessDir);
    if (!enforcement.hard) continue; // soft mode — silent pass
    return { block: true, reason: formatStatusWriteBlockReason(violations, STATUS_SKILL_POINTER) };
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Gate 2 — task dispatch
// ---------------------------------------------------------------------------

/**
 * Engine-version compat: `composeDispatchGate` postdates the engine release
 * containing it (published floor `^2.0.2` lacks it) — a static named import
 * would fail at module link on older engines and drop the WHOLE hook (both
 * gates), so it is loaded lazily and cached (module-level cached dynamic
 * import). The loader returns a DISCRIMINATED result so
 * a missing export (`missing`) is never conflated with a real import
 * failure (`error`): Gate 2 skips itself either way (see `gateTaskDispatch`),
 * but the two produce different one-time warnings.
 */
type DispatchGateFn = (text: string, options?: { caller?: string; callerRequired?: boolean; writable?: boolean }) => {
  ok: boolean;
  shaped: boolean;
  enforcement: { hard: boolean };
  violations: ValidationResult[];
};

type ComposeDispatchGateLoad =
  | { status: "ok"; gate: DispatchGateFn }
  | { status: "missing" }
  | { status: "error"; error: unknown };

let cachedDispatchGate: Promise<ComposeDispatchGateLoad> | null = null;

export function loadComposeDispatchGate(): Promise<ComposeDispatchGateLoad> {
  cachedDispatchGate ??= import("@mstar-harness/engine")
    .then((mod) =>
      typeof mod.composeDispatchGate === "function"
        ? ({ status: "ok", gate: mod.composeDispatchGate as DispatchGateFn } as const)
        : ({ status: "missing" } as const),
    )
    .catch((error: unknown) => ({ status: "error", error } as const));
  return cachedDispatchGate;
}

/**
 * Test seam for the degradation path: smoke scripts replace `load` to
 * simulate an engine build without `composeDispatchGate` (missing) or a
 * broken engine import (error) — ESM namespace bindings are read-only, so
 * the holder indirection is what makes the degrade cases stub-able.
 * Runtime default is the cached loader.
 */
export const dispatchGateLoader: { load: () => Promise<ComposeDispatchGateLoad> } = {
  load: loadComposeDispatchGate,
};

/** One-time degradation warnings (module-level flags): emitted via the
 * extension logger on the first task event while Gate 2 is unavailable —
 * one message for a missing `composeDispatchGate` export (upgrade hint), a
 * DIFFERENT one for a real engine import failure (no upgrade claim — the
 * module itself is broken). Defensive — the logger may be absent, and the
 * degrade path must never throw (optional chaining + local try/catch). */
let dispatchGateWarned = false;
let dispatchGateImportErrorWarned = false;

function warnDispatchGateDegraded(logger: unknown, reason: "missing" | "error", error?: unknown): void {
  if (reason === "missing") {
    if (dispatchGateWarned) return;
    dispatchGateWarned = true;
  } else {
    if (dispatchGateImportErrorWarned) return;
    dispatchGateImportErrorWarned = true;
  }
  const message =
    reason === "missing"
      ? "mstar-gates: installed engine lacks composeDispatchGate — task dispatch gate (Gate 2) disabled; status gate unaffected; upgrade the engine (next release)"
      : `mstar-gates: task dispatch gate (Gate 2) disabled: engine import failed — ${error instanceof Error ? error.message : String(error)}; status gate unaffected`;
  try {
    (
      logger as
        | { warn?: (message: string, context?: Record<string, unknown>) => void }
        | undefined
    )?.warn?.(message);
  } catch {
 // degrade path must never throw
  }
}

/**
 * Validate one dispatch entry via the engine's single shared composition
 * `dispatch.composeDispatchGate` (the same composition
 * opencode `validateDispatchAssignment` and `mstar_dispatch_validate` use,
 * incl. the `$MSTAR_WORKING_BRANCH` env fallback /
 * ): field validation with `writable: false` for read-only roles,
 * and the default-branch gate for writable roles. NO anti-recursion leg on
 * omp (issue #156): `entry.agent` is the spawn TARGET, and omp's
 * `tool_call` event carries no caller identity (ToolCallEvent =
 * { toolName, toolCallId, input }), so the precheck cannot run soundly —
 * target == `Execute as` is the documented C5 pattern, not recursion. The
 * NEVER red line stays prompt-level on this host. Returns the entry's
 * violations and its OWN header enforcement flag (an example
 * `**Enforcement**: hard` line in the task body never hardens).
 */
function validateDispatchEntry(
  entry: DispatchEntry,
  composeDispatchGate: DispatchGateFn,
): { violations: ValidationResult[]; hard: boolean } {
  const text = entry.task;
 // Read-only roles (scout/explore) skip the branch-form/default-branch gates.
  const writable = isReadOnlyAssignmentRole(parseAssignmentFields(text).executeAs ?? "") ? false : undefined;
  const composed = composeDispatchGate(text, { writable });
  return { violations: composed.violations, hard: composed.enforcement.hard };
}

/**
 * Block a `task` tool_call when any Assignment-shaped entry has violations
 * AND hard enforcement governs it: the entry's OWN header
 * `Enforcement: hard`, or the repo-level setting (`.mstarc` → compass via
 * `resolveRepoEnforcement`, resolved once per event from the session cwd —
 * Gate 1 and dsh `resolveDispatchHard` parity; the pre-#156 header-only
 * read let a hard compass leave Gate 2 unhardened). Soft-governed
 * violations never block but ARE warn-logged through `logSoft` (opencode
 * warn-channel parity — silent drops hide gate/model drift).
 *
 * When the engine build lacks `composeDispatchGate` (predating the export)
 * or the engine import itself fails, Gate 2 is SKIPPED entirely — no
 * blocking, no violations — with a one-time warning; Gate 1 (status) keeps
 * working (engine-version compatibility).
 */
async function gateTaskDispatch(
  eventInput: unknown,
  warnDegraded: (reason: "missing" | "error", error?: unknown) => void,
  logSoft: (line: string) => void,
): Promise<{ block: true; reason: string } | undefined> {
  const load = await dispatchGateLoader.load();
  if (load.status !== "ok") {
    warnDegraded(load.status, load.status === "error" ? load.error : undefined);
    return undefined;
  }
  const composeDispatchGate = load.gate;
 // Repo-level hard (`.mstarc` wins, else compass) hardens flag-less
 // entries — same source Gate 1 uses for coordination writes.
  const harnessDir = resolveHarnessDir();
  const repoHard = harnessDir !== null && resolveRepoEnforcement(harnessDir).hard;
  const blocked: string[] = [];
  for (const entry of taskDispatchEntries(eventInput)) {
    const { violations, hard } = validateDispatchEntry(entry, composeDispatchGate);
    if (violations.length === 0) continue;
    const label = entry.name !== "" ? `"${entry.name}"` : entry.agent !== "" ? `agent "${entry.agent}"` : "(unnamed)";
    if (!hard && !repoHard) {
 // Soft mode: never block, but surface the violations (opencode parity).
      for (const violation of violations) {
        logSoft(`task dispatch entry ${label}: ${violationLine(violation)} (${DISPATCH_SKILL_POINTER})`);
      }
      continue;
    }
    for (const violation of violations) {
      blocked.push(`task dispatch entry ${label}: ${violationLine(violation)} (${DISPATCH_SKILL_POINTER})`);
    }
  }
  if (blocked.length === 0) return undefined;
  return { block: true, reason: blocked.join("\n") };
}

// ---------------------------------------------------------------------------
// Factory: one module, one handler
// ---------------------------------------------------------------------------

export default function mstarGates(pi: ExtensionAPI): void {
  const warnDegraded = (reason: "missing" | "error", error?: unknown): void =>
    warnDispatchGateDegraded(pi.logger, reason, error);
  pi.on("tool_call", async (event) => {
    try {
      const toolName = event?.toolName ?? "";
      let block: { block: true; reason: string } | undefined;
      if (toolName === "write" || toolName === "edit") {
        block = gateStatusWrite(event?.input);
      } else if (toolName === "task") {
        block = await gateTaskDispatch(event?.input, warnDegraded, (line) => {
          try {
            (
              pi.logger as
                | { warn?: (message: string, context?: Record<string, unknown>) => void }
                | undefined
            )?.warn?.(line);
          } catch {
 // the warn channel must never throw into the fail-closed host path
          }
        });
      }
      return block;
    } catch {
 // NEVER throw, NEVER block on unexpected errors: omp fails CLOSED when
 // a handler throws — every unexpected failure degrades to silent pass.
      return undefined;
    }
  });
}
