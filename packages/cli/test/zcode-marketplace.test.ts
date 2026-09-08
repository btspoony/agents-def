/**
 * zcode adapter — bootstrap marketplace entry seeding.
 *
 * The bootstrap `marketplace.json` seed carries the CLI release version —
 * the exact value doctor's `validateMarketplaceJson` compares against — so a
 * current-CLI install always passes doctor. ZCode's marketplace refresh
 * overwrites the seed with the repo-shipped manifest, which pins the same
 * release version.
 */
import { describe, expect, test } from "bun:test";
import { marketplacePluginEntry } from "../src/adapters/zcode";
import { readHarnessVersion } from "../src/utils";

describe("marketplacePluginEntry (zcode bootstrap snapshot)", () => {
  test("seeds version from the CLI release version (the value doctor validates against)", () => {
    expect(marketplacePluginEntry().version).toBe(readHarnessVersion());
  });

  test("entry shape stays in sync with the repo-shipped marketplace manifests", () => {
    const entry = marketplacePluginEntry();
    expect(entry.name).toBe("morning-star-harness");
    expect(entry.source).toEqual({ source: "github", repo: "btspoony/mstar-harness", ref: "main" });
    expect(entry.displayName).toBe("Morning Star Harness");
    expect(entry.category).toBe("Productivity");
    expect(entry.description).toContain("Multi-agent code harness");
    expect(entry.icon).toContain("assets/icon.png");
  });
});
