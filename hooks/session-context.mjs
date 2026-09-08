#!/usr/bin/env node
// Morning Star harness — ZCode SessionStart hook.
// Detects a harness-managed workspace ({HARNESS_DIR} discovery per mstar-conventions:
// `.mstarc` harness_dir override -> `.mstar/` -> `.agents/` -> `.plans/`/`plans/`,
// probed at the git workspace root) and injects a compact status summary so the
// session knows the harness is active before any role work starts.
// Silent no-op outside harness workspaces. Never fails the session: any error exits 0.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

function readStdinJson() {
  try {
    const raw = fs.readFileSync(0, "utf8");
    if (!raw.trim()) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function git(args, cwd) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
}

function workspaceRoot(cwd) {
  try {
    const top = git(["rev-parse", "--show-toplevel"], cwd);
    if (top) return top;
  } catch {
    // not a git repo — probe from cwd; per mstar-conventions the probe
    // never crosses the workspace root
  }
  return cwd;
}

function parseMstarcHarnessDir(root) {
  try {
    const text = fs.readFileSync(path.join(root, ".mstarc"), "utf8");
    let inConfig = false;
    for (const line of text.split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith("#") || t.startsWith(";")) continue;
      const section = t.match(/^\[([^\]]+)\]$/);
      if (section) {
        inConfig = section[1].trim() === "config";
        continue;
      }
      if (!inConfig) continue;
      const kv = t.match(/^harness_dir\s*=\s*(.+)$/);
      if (kv) return kv[1].trim().replace(/^["']|["']$/g, "");
    }
  } catch {
    // no .mstarc at the workspace root — fall through to the default chain
  }
  return null;
}

function resolveHarnessDir(root) {
  const declared = parseMstarcHarnessDir(root);
  // A declared harness_dir wins even when it does not exist yet — `.mstarc`
  // directory keys are valid before first scaffold; report it as uninitialized
  // rather than falling through to the default candidates.
  if (declared) {
    return path.isAbsolute(declared) ? declared : path.join(root, declared);
  }
  for (const candidate of [".mstar", ".agents", ".plans", "plans"]) {
    const dir = path.join(root, candidate);
    try {
      if (fs.statSync(dir).isDirectory()) return dir;
    } catch {
      // keep probing
    }
  }
  return null;
}

function summarizeStatus(harnessDir) {
  const statusPath = path.join(harnessDir, "status.json");
  let json;
  try {
    json = JSON.parse(fs.readFileSync(statusPath, "utf8"));
  } catch {
    return "status.json: not initialized yet (scaffold with `mstar harness scaffold` or `npx @mstar-harness/cli`)";
  }
  const workflows = Array.isArray(json.workflows) ? json.workflows : [];
  if (workflows.length === 0) {
    return "status.json: v2, no workflows registered";
  }
  const lines = [`status.json: v2, ${workflows.length} workflow(s)`];
  for (const wf of workflows.slice(0, 5)) {
    const id = wf && typeof wf.id === "string" ? wf.id : "(unnamed)";
    // v2 root entries carry registry fields (id/type/started_at/dir); lifecycle
    // status/phase live in each workflow's snapshot under workflows/<id>/.
    const state = [wf?.type, wf?.status, wf?.phase].filter((v) => typeof v === "string" && v).join("/");
    const started = typeof wf?.started_at === "string" ? wf.started_at.slice(0, 10) : "";
    lines.push(`  - ${id}${state ? `: ${state}` : ""}${started ? ` (started ${started})` : ""}`);
  }
  if (workflows.length > 5) lines.push(`  - … ${workflows.length - 5} more`);
  return lines.join("\n");
}

const input = readStdinJson();
try {
  const cwd = typeof input.cwd === "string" && input.cwd ? input.cwd : process.cwd();
  const root = workspaceRoot(cwd);
  const harnessDir = resolveHarnessDir(root);
  if (!harnessDir) process.exit(0); // not a harness workspace — stay silent

  const context = [
    `[Morning Star] Harness workspace detected — {HARNESS_DIR} at \`${harnessDir}\`.`,
    `- ${summarizeStatus(harnessDir)}`,
    "- Before PM/role/dispatch work, load `mstar-harness-core` (ZCode: `/skill:mstar-harness-core`); branch, worktree, and QC checkout gates → `mstar-branch-worktree`.",
  ].join("\n");

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "SessionStart",
        additionalContext: context,
      },
    }),
  );
} catch {
  // best-effort context only — never break session start
}
process.exit(0);
