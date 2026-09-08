/**
 * zcode adapter — bootstrap marketplace entry version resolution.
 *
 * The bootstrap `marketplace.json` seed must carry the plugin `version`
 * (from the local harness checkout's `.zcode-plugin/plugin.json`), so ZCode
 * can compare it against the versioned repo manifest after a marketplace
 * refresh. Falls back to the CLI package version when the marker is
 * unreadable.
 */
import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveMarketplaceEntryVersion } from "../src/adapters/zcode";

function withTempMarker(content: string | null, fn: (markerPath: string) => void): void {
  const dir = mkdtempSync(join(tmpdir(), "mstar-zcode-marker-"));
  try {
    const markerPath = join(dir, ".zcode-plugin", "plugin.json");
    if (content !== null) {
      mkdirSync(join(dir, ".zcode-plugin"), { recursive: true });
      writeFileSync(markerPath, content);
    }
    fn(markerPath);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe("resolveMarketplaceEntryVersion (zcode bootstrap entry)", () => {
  test("reads the version from the local checkout's .zcode-plugin/plugin.json", () => {
    withTempMarker(JSON.stringify({ name: "morning-star-harness", version: "3.7.0" }), (markerPath) => {
      expect(resolveMarketplaceEntryVersion(markerPath, "0.0.0-fallback")).toBe("3.7.0");
    });
  });

  test("falls back to the CLI package version when the marker is missing", () => {
    withTempMarker(null, (markerPath) => {
      expect(resolveMarketplaceEntryVersion(markerPath, "1.2.3")).toBe("1.2.3");
    });
  });

  test("falls back when the marker is unparseable or versionless", () => {
    withTempMarker("not json {", (markerPath) => {
      expect(resolveMarketplaceEntryVersion(markerPath, "1.2.3")).toBe("1.2.3");
    });
    withTempMarker(JSON.stringify({ name: "morning-star-harness" }), (markerPath) => {
      expect(resolveMarketplaceEntryVersion(markerPath, "1.2.3")).toBe("1.2.3");
    });
    withTempMarker(JSON.stringify({ version: 42 }), (markerPath) => {
      expect(resolveMarketplaceEntryVersion(markerPath, "1.2.3")).toBe("1.2.3");
    });
    withTempMarker(JSON.stringify({ version: "" }), (markerPath) => {
      expect(resolveMarketplaceEntryVersion(markerPath, "1.2.3")).toBe("1.2.3");
    });
  });
});
