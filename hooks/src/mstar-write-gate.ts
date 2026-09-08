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

import { readFileSync, writeSync } from "node:fs";
import { isAbsolute, join, relative } from "node:path";
import {
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

  // Known limitations (omp parity, fail-open — beyond the failure-matrix
  // rows): classification is textual, so a symlink alias whose textual path
  // sits outside the harness tree bypasses the gate (no target realpath);
  // Edit events validate the PRE-edit on-disk state, so a corrupting edit
  // surfaces on the next write, and repairing an already-invalid gated doc
  // requires a full-content Write (which validates the new document).
  for (const rawPath of writeTargetPaths(tool)) {
    const targetPath = isAbsolute(rawPath) ? rawPath : join(cwd, rawPath);
    const target = harnessDocKindOfTarget(targetPath);
    if (target === null) continue; // not a gated coordination write — silent pass

    // `content` as a string is the new document; anything else (including
    // new_string/old_string edits and ApplyPatch shapes) validates the
    // on-disk file — a nonexistent target passes (fresh-scaffold parity).
    const violations = validateStatusWriteDoc(tool.content, targetPath, target.kind);
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
