#!/usr/bin/env node
// Morning Star harness — ZCode PreToolUse(Bash) git guard.
// Deterministic backstop for the mstar-branch-worktree runtime rules:
//   1. No direct `git commit` on the default protected branch (origin/HEAD,
//      falling back to main/master) without an explicit Assignment
//      `Branch policy: direct on <branch>` — bypass per-session with
//      MSTAR_ALLOW_DEFAULT_BRANCH_COMMIT=1, or disable the whole hook with
//      MSTAR_BRANCH_GUARD=off.
//   2. No bare `git push --force` / `-f` — history rewrites publish with
//      `--force-with-lease=<branch>:<observed-oid>` only.
// Silent pass (exit 0) for anything else, outside git repos, or on internal
// errors — the hook gates, it never blocks the session by malfunctioning.

import fs from "node:fs";
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

function gitOut(args, cwd) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
}

function deny(reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: reason,
      },
    }),
  );
  process.exit(0);
}

const BARE_FORCE = /(^|\s)--force(\s|$)|(^|\s)-f(\s|$)/;

const input = await readStdinJson();
try {
  if (process.env.MSTAR_BRANCH_GUARD === "off") process.exit(0);
  if (input?.tool_name && input.tool_name !== "Bash") process.exit(0);

  const command = String(input?.tool_input?.command ?? "");
  if (!command) process.exit(0);

  const cwd = typeof input?.cwd === "string" && input.cwd ? input.cwd : process.cwd();

  const isCommit = /\bgit\s+commit\b/.test(command);
  const isPush = /\bgit\s+push\b/.test(command);
  if (!isCommit && !isPush) process.exit(0);

  let root;
  try {
    root = gitOut(["rev-parse", "--show-toplevel"], cwd);
  } catch {
    process.exit(0); // not a git repo
  }

  if (isCommit) {
    let branch = "";
    try {
      branch = gitOut(["rev-parse", "--abbrev-ref", "HEAD"], root);
    } catch {
      process.exit(0);
    }
    if (branch && branch !== "HEAD" && process.env.MSTAR_ALLOW_DEFAULT_BRANCH_COMMIT !== "1") {
      let defaultBranch = "";
      try {
        defaultBranch = gitOut(["symbolic-ref", "refs/remotes/origin/HEAD"], root).replace(/^origin\//, "");
      } catch {
        defaultBranch = /^(main|master)$/.test(branch) ? branch : "";
      }
      if (defaultBranch && branch === defaultBranch) {
        deny(
          `Morning Star branch gate (mstar-branch-worktree): direct commits on the default protected branch \`${branch}\` are blocked. ` +
            `Work on a feature/working branch (e.g. \`git checkout -b feature/<slug>\`), or — only with an explicit ` +
            `\`Branch policy: direct on ${branch}\` decision — re-run with MSTAR_ALLOW_DEFAULT_BRANCH_COMMIT=1 ` +
            `(set it in the session environment, or prefix the command: \`MSTAR_ALLOW_DEFAULT_BRANCH_COMMIT=1 <command>\`).`,
        );
      }
    }
  }

  if (isPush && BARE_FORCE.test(command) && !command.includes("--force-with-lease")) {
    deny(
      "Morning Star push gate (mstar-branch-worktree): bare `git push --force` is blocked — history rewrites on pushed branches " +
        "must publish with `--force-with-lease=<branch>:<observed-oid>` after fetching the remote OID first " +
        "(disable the whole guard with MSTAR_BRANCH_GUARD=off only as a deliberate exception).",
    );
  }
} catch {
  // internal error — pass silently; the hook must never wedge a session
}
process.exit(0);
