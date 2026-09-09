/**
 * kimi target adapter — minimal install-mode adapter (plan batch 2, T6).
 *
 * Kimi manages the Morning Star plugin through the TUI (`/plugins install`);
 * the kimi CLI has no plugin subcommand, so:
 *   - init is notes-only and harmless (zero mutations, TUI hint only);
 *   - doctor never requires the kimi binary and never errors on an absent
 *     install (the CLI ↔ plugin alignment note — including the not-installed
 *     TUI hint — is printed centrally by runDoctor in index.ts via
 *     `../src/plugin-version-alignment`, so the adapter adds no note).
 * Pure shape tests: no filesystem writes, no subprocesses.
 */
import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { getAdapter } from "../src/adapters";
import { kimiAdapter } from "../src/adapters/kimi";
import { SUPPORTED_TARGETS } from "../src/types";

describe("kimi target registration", () => {
  test("kimi is a supported target and resolves to the install-mode adapter", () => {
    expect(SUPPORTED_TARGETS).toContain("kimi");
    const adapter = getAdapter("kimi");
    expect(adapter.target).toBe("kimi");
    expect(adapter.mode).toBe("install");
  });
});

describe("kimiAdapter", () => {
  test("doctor: no errors, no notes (alignment note is central), location = managed plugins root", () => {
    const result = kimiAdapter.runInstallDoctor!("project");
    expect(result.errors).toEqual([]);
    expect(result.notes).toEqual([]);
    expect(result.location.endsWith(join("plugins", "managed"))).toBe(true);
  });

  test("init: notes-only and harmless — TUI install hint, zero mutations", () => {
    for (const dryRun of [false, true]) {
      const result = kimiAdapter.runInstallInit!("project", dryRun);
      expect(result.location.endsWith(join("plugins", "managed"))).toBe(true);
      expect(result.notes).toEqual(["Install via Kimi TUI: /plugins install"]);
    }
  });

  test("doctor does not require the kimi binary (no subprocess surface)", () => {
    // The adapter exposes no binary probe: doctor shape is static. Pin the
    // contract — the same call twice is identical (no hidden state).
    expect(kimiAdapter.runInstallDoctor!("global")).toEqual(kimiAdapter.runInstallDoctor!("global"));
  });
});
