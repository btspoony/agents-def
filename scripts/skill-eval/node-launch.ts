/**
 * Node adapter for the eval runner's launch seam: the ONLY module that knows
 * about child processes. Everything upstream (prepare / run / report) works
 * against the SpawnFn / SpawnRequest / SpawnResult contract in runner.ts.
 */
import { closeSync, openSync } from "node:fs";
import { spawn } from "node:child_process";
import type { SpawnRequest, SpawnResult } from "./runner.ts";

const KILL_GRACE_MS = 5_000;

/**
 * Default argv-array launch: no shell, no string interpolation. stdout/stderr
 * stream straight into their evidence files; stdin reads the prompt file.
 * Timed-out children get SIGTERM, then SIGKILL after a grace period; the
 * observed exit code / signal / timedOut flag are preserved on the result.
 */
export function nodeLaunch(request: SpawnRequest): Promise<SpawnResult> {
  return new Promise((resolveSpawn) => {
    const stdinFd = openSync(request.stdinFile, "r");
    const stdoutFd = openSync(request.stdoutFile, "a");
    const stderrFd = openSync(request.stderrFile, "a");
    // Argv array + shell:false — nothing is routed through a shell.
    const child = spawn(request.file, [...request.argv], {
      cwd: request.cwd,
      stdio: [stdinFd, stdoutFd, stderrFd],
      shell: false,
    });
    let timedOut = false;
    let killTimer: ReturnType<typeof setTimeout> | null = null;
    const termTimer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      killTimer = setTimeout(() => child.kill("SIGKILL"), KILL_GRACE_MS);
    }, request.timeoutMs);
    let settled = false;
    const finish = (result: SpawnResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(termTimer);
      if (killTimer) clearTimeout(killTimer);
      closeSync(stdinFd);
      closeSync(stdoutFd);
      closeSync(stderrFd);
      resolveSpawn(result);
    };
    child.on("error", (error) => {
      finish({ code: null, signal: null, timedOut, spawnError: String(error) });
    });
    child.on("close", (code, signal) => {
      finish({ code, signal, timedOut, spawnError: null });
    });
  });
}
