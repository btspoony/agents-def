// Morning Star harness — ZCode PreToolUse(Write|Edit) coordination-write gate.
// Engine-backed Gate 1 for the ZCode host: blocks hard-enforced writes to the
// three v3 harness coordination documents (root status.json, workflow
// snapshots, project registers) through the SAME classification + validation
// path the omp gate uses — the `gates` module of `@mstar-harness/engine`,
// inlined into this file at build (see scripts/build-zcode-hooks.ts).
//
// Block dialect (contract D4): exit code 2 with the reason on STDERR — ZCode
// parses hook stdout under a strict schema where any extra key silently
// discards the deny (invisible fail-open); the exit-code channel has no
// schema to violate. Stdout stays empty in every case. Pass is exit 0 with
// no output. Soft mode stays a SILENT pass (omp Gate-1 parity).
//
// Fail-open everywhere except deliberate hard-mode blocks (contract D5):
// unparseable stdin, missing fields, unknown tools, unreadable fs, oversized
// content, and any unexpected internal error exit 0 without output. Invalid
// JSON in write content is NOT a silent pass — it is a `status.invalid-json`
// violation that can block under hard enforcement. The whole gate body is
// wrapped in a catch-all so the hook never wedges a session.
//
// Opt out for a session with MSTAR_WRITE_GATE=off (checked first, mirroring
// MSTAR_BRANCH_GUARD=off in git-guard.mjs). Source-side literals stay pure
// ASCII (lint-ascii-literals covers hooks/src) — bun build re-normalizes
// \uXXXX string escapes to raw UTF-8 in the bundle, and the hook executes
// under node, which decodes them correctly (bundle smoke renders the case).

import { readFileSync, statSync, writeSync } from "node:fs";
import { isAbsolute, join, relative } from "node:path";
import {
  MAX_STATUS_CONTENT_LENGTH,
  formatStatusWriteBlockReason,
  harnessDocKindOfTarget,
  resolveRepoEnforcement,
  validateStatusWriteDoc,
} from "@mstar-harness/engine";

const SKILL_POINTER = "skill: mstar-artifacts/references/status-and-residuals.md";
const ENFORCEMENT_LINE =
  "Enforcement: hard \u2014 this repo opts in via .mstarc/compass; disable for this session with MSTAR_WRITE_GATE=off.";

// Bounds (failure matrix row 7): per-target cost is bounded by local reads +
// the 2 MB guards; the target COUNT is bounded here — a hostile envelope
// carrying a huge paths[] skips the overflow silently (fail-open) instead of
// accumulating fs probes toward the 10 s hook timeout.
const MAX_GATED_TARGETS = 32;

/** Display-safe path text: control characters (which the engine's `[^/]+`
 * canonical-rel patterns admit) are hex-escaped so the stderr block header
 * stays one line and cannot forge violation-looking lines. */
function displaySafe(text: string): string {
  return text.replace(/[\x00-\x1f\x7f]/g, (ch) => `\\x${ch.charCodeAt(0).toString(16).padStart(2, "0")}`);
}

function readStdinJson(): Record<string, unknown> {
  try {
    // Tolerant stdin read (house style, git-guard.mjs): empty or
    // unparseable stdin is an empty envelope; a closed fd 0 throws and is
    // treated the same way.
    const raw = readFileSync(0, "utf8");
    if (!raw.trim()) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    return parsed as Record<string, unknown>;
  } catch {
    return {};
  }
}

/**
 * Target paths from a ZCode Write/Edit `tool_input` (contract D3 union):
 * non-empty string `file_path`, non-empty string `path`, and each
 * non-empty string element of `paths[]`. Unknown extra keys are ignored and
 * never manufacture targets; nothing here can throw. The result is capped
 * at MAX_GATED_TARGETS — overflow targets skip gating silently (fail-open).
 */
function writeTargetPaths(toolInput: Record<string, unknown>): string[] {
  const paths: string[] = [];
  const push = (value: unknown): void => {
    if (typeof value === "string" && value.trim() !== "") paths.push(value);
  };
  push(toolInput.file_path);
  push(toolInput.path);
  if (Array.isArray(toolInput.paths)) {
    for (const value of toolInput.paths) push(value);
  }
  return paths.slice(0, MAX_GATED_TARGETS);
}

/**
 * Deterministic post-edit reconstruction: an Edit payload with non-empty
 * `old_string` + `new_string` (and no `content`) is validated against the
 * RECONSTRUCTED result instead of the pre-edit on-disk state — a corrupting
 * deterministic edit can no longer pass hard enforcement. Deterministic =
 * `old_string` occurs exactly once (replace that occurrence), or
 * `replace_all: true` with >= 1 occurrence (replace all). Anything else —
 * missing/empty pieces, 0 matches, >1 match without `replace_all`, an
 * oversized target (fallback keeps the read budget bounded), read/replace
 * errors — returns undefined and the gate falls back to the pre-edit
 * validation. Best-effort by contract: never throws, never widens the gate.
 */
function reconstructEditContent(tool: Record<string, unknown>, targetPath: string): string | undefined {
  try {
    if (tool.content !== undefined) return undefined; // content-bearing payloads take the content path upstream
    const oldString = tool.old_string;
    const newString = tool.new_string;
    if (typeof oldString !== "string" || oldString === "") return undefined;
    if (typeof newString !== "string" || newString === "") return undefined;
    if (statSync(targetPath).size > MAX_STATUS_CONTENT_LENGTH) return undefined; // oversized: bounded fallback (violates there when opted in)
    const current = readFileSync(targetPath, "utf8");
    const first = current.indexOf(oldString);
    if (first === -1) return undefined; // 0 matches — not deterministic
    const replaceAll = tool.replace_all === true;
    if (!replaceAll && current.indexOf(oldString, first + 1) !== -1) return undefined; // ambiguous
    if (replaceAll) return current.split(oldString).join(newString);
    return current.slice(0, first) + newString + current.slice(first + oldString.length);
  } catch {
    return undefined; // any error — pre-edit fallback path (fail-open)
  }
}

const input = readStdinJson();
try {
  if (process.env.MSTAR_WRITE_GATE === "off") process.exit(0);

  // `hook_event_name` is intentionally unkeyed: the hooks.json matcher
  // already scopes the event to PreToolUse; this re-check is defense-in-depth.
  const toolName = typeof input.tool_name === "string" ? input.tool_name : "";
  if (toolName !== "Write" && toolName !== "Edit") process.exit(0);

  const toolInput = input.tool_input;
  if (typeof toolInput !== "object" || toolInput === null) process.exit(0);
  const tool = toolInput as Record<string, unknown>;

  // Relative targets resolve against the event cwd, falling back to the
  // hook process cwd (git-guard.mjs:153 precedent — the hook process cwd is
  // not necessarily the workspace).
  const cwd = typeof input.cwd === "string" && input.cwd ? input.cwd : process.cwd();

  // Known limitations (beyond the failure-matrix rows): classification is
  // textual — a symlink alias whose textual path sits outside the harness
  // tree bypasses the gate (no target realpath; omp parity). Edits validate
  // the reconstructed post-edit content when the payload is deterministic
  // (unique old_string match, or replace_all), otherwise the PRE-edit
  // on-disk state — a non-deterministic corrupting edit surfaces on the
  // next write, and repairing an already-invalid gated doc requires a
  // deterministic edit or a full-content Write. Oversized gated docs (past
  // the 2 MiB budget) violate on this host — repair out of band or for
  // this session with MSTAR_WRITE_GATE=off.
  for (const rawPath of writeTargetPaths(tool)) {
    const targetPath = isAbsolute(rawPath) ? rawPath : join(cwd, rawPath);
    const target = harnessDocKindOfTarget(targetPath);
    if (target === null) continue; // not a gated coordination write — silent pass

    // `content` as a string is the new document; anything else (including
    // new_string/old_string edits and ApplyPatch shapes) validates the
    // on-disk file — a nonexistent target passes (fresh-scaffold parity).
    // Deterministic edits (unique old_string match, or replace_all) validate
    // the RECONSTRUCTED post-edit content; ambiguous or erroring
    // reconstruction falls back to the pre-edit on-disk state.
    const content = typeof tool.content === "string" ? tool.content : reconstructEditContent(tool, targetPath) ?? tool.content;
    // Oversized writes are a violation on this host (exit-2 under hard,
    // silent under soft) instead of a permission — omp keeps the default
    // silent pass.
    const violations = validateStatusWriteDoc(content, targetPath, target.kind, { oversized: "violate" });
    if (violations.length === 0) continue;

    const enforcement = resolveRepoEnforcement(target.harnessDir);
    if (!enforcement.hard) continue; // soft mode — silent pass (omp Gate-1 parity)

    const rel = relative(target.harnessDir, targetPath);
    const display = displaySafe(rel && !rel.startsWith("..") && !isAbsolute(rel) ? rel : targetPath);
    // writeSync on fd 2: the block reason MUST survive process.exit —
    // process.stderr.write buffers asynchronously on some platforms.
    writeSync(2, `[Morning Star write gate] blocked ${toolName} to ${display}\n`);
    writeSync(2, `${formatStatusWriteBlockReason(violations, SKILL_POINTER)}\n`);
    writeSync(2, `${ENFORCEMENT_LINE}\n`);
    process.exit(2);
  }
} catch {
  // internal error — pass silently; the gate never manufactures a block
  // from data it could not read, and never wedges the session
}
process.exit(0);
