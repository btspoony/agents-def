/**
 * zcode target adapter — plugin/CLI version-alignment doctor note (plan T1).
 *
 * Two units, both fully hermetic (temp-dir roots / injected version sources,
 * never the real home):
 *   - `detectInstalledZcodePluginVersion(cacheRoot)`: scans
 *     `<cacheRoot>/<marketplace>/morning-star-harness/<version>/` for the
 *     highest installed semver — manifest `version` field preferred (both
 *     `.zcode-plugin/plugin.json` and root `plugin.json` shapes), directory
 *     name as fallback, malformed manifests degrade to the dir name, absent
 *     or unreadable caches report `null` (never throws);
 *   - `formatZcodePluginVersionDoctorNote(cli, installed)`: the four pinned
 *     note states — aligned, CLI newer (update the plugin), plugin newer
 *     (update the CLI), nothing installed (install hint, no direction).
 * Informational contract: the formatter is a plain string builder used for
 * the doctor `notes` channel, so nothing here can reach `errors` or the
 * exit code.
 */
import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { detectInstalledZcodePluginVersion, formatZcodePluginVersionDoctorNote } from "../src/adapters/zcode";

const PLUGIN_DIR_NAME = "morning-star-harness";

interface VersionDirOptions {
  /** `version` written into `.zcode-plugin/plugin.json`. */
  zcodeManifestVersion?: string;
  /** `version` written into root `plugin.json`. */
  rootManifestVersion?: string;
  /** Write an unparseable `.zcode-plugin/plugin.json`. */
  malformedManifest?: boolean;
}

/** Materialize one cache version dir under `<cacheRoot>/<marketplace>/morning-star-harness/<dirName>/`. */
function makeVersionDir(
  cacheRoot: string,
  marketplace: string,
  dirName: string,
  opts: VersionDirOptions = {},
): string {
  const dir = join(cacheRoot, marketplace, PLUGIN_DIR_NAME, dirName);
  mkdirSync(dir, { recursive: true });
  if (opts.zcodeManifestVersion !== undefined) {
    mkdirSync(join(dir, ".zcode-plugin"), { recursive: true });
    writeFileSync(
      join(dir, ".zcode-plugin", "plugin.json"),
      JSON.stringify({ name: PLUGIN_DIR_NAME, version: opts.zcodeManifestVersion }),
    );
  }
  if (opts.rootManifestVersion !== undefined) {
    writeFileSync(join(dir, "plugin.json"), JSON.stringify({ name: PLUGIN_DIR_NAME, version: opts.rootManifestVersion }));
  }
  if (opts.malformedManifest) {
    mkdirSync(join(dir, ".zcode-plugin"), { recursive: true });
    writeFileSync(join(dir, ".zcode-plugin", "plugin.json"), "{ not json");
  }
  return dir;
}

/** Fresh temp cache root; `withCache` removes it after `fn`. */
function withCache(fn: (cacheRoot: string) => void): void {
  const cacheRoot = mkdtempSync(join(tmpdir(), "zcode-cache-"));
  try {
    fn(cacheRoot);
  } finally {
    rmSync(cacheRoot, { recursive: true, force: true });
  }
}

describe("detectInstalledZcodePluginVersion", () => {
  test("missing cache root reports null (no throw)", () => {
    expect(detectInstalledZcodePluginVersion(join(tmpdir(), "zcode-cache-does-not-exist"))).toBeNull();
  });

  test("empty cache root reports null", () => {
    withCache((cacheRoot) => {
      expect(detectInstalledZcodePluginVersion(cacheRoot)).toBeNull();
    });
  });

  test("manifest version wins over the directory name", () => {
    withCache((cacheRoot) => {
      makeVersionDir(cacheRoot, "mstar-local", "3.7.0", { zcodeManifestVersion: "3.6.0" });
      expect(detectInstalledZcodePluginVersion(cacheRoot)).toBe("3.6.0");
    });
  });

  test("root plugin.json is the manifest fallback when .zcode-plugin is absent", () => {
    withCache((cacheRoot) => {
      makeVersionDir(cacheRoot, "mstar-local", "3.7.0", { rootManifestVersion: "3.7.0" });
      expect(detectInstalledZcodePluginVersion(cacheRoot)).toBe("3.7.0");
    });
  });

  test("directory name is the fallback when no manifest carries a version", () => {
    withCache((cacheRoot) => {
      makeVersionDir(cacheRoot, "mstar-local", "3.7.0");
      expect(detectInstalledZcodePluginVersion(cacheRoot)).toBe("3.7.0");
    });
  });

  test("malformed manifest degrades to the directory name instead of throwing", () => {
    withCache((cacheRoot) => {
      makeVersionDir(cacheRoot, "mstar-local", "3.7.0", { malformedManifest: true });
      expect(detectInstalledZcodePluginVersion(cacheRoot)).toBe("3.7.0");
    });
  });

  test("multiple versions across marketplaces resolve to the highest semver", () => {
    withCache((cacheRoot) => {
      makeVersionDir(cacheRoot, "mstar-local", "3.6.0");
      makeVersionDir(cacheRoot, "other-marketplace", "3.7.0", { zcodeManifestVersion: "3.7.0" });
      makeVersionDir(cacheRoot, "mstar-local", "3.7.0-rc.1", { rootManifestVersion: "3.7.0-rc.1" });
      expect(detectInstalledZcodePluginVersion(cacheRoot)).toBe("3.7.0");
    });
  });

  test("non-version-shaped directories are ignored", () => {
    withCache((cacheRoot) => {
      makeVersionDir(cacheRoot, "mstar-local", "tmp-checkout");
      expect(detectInstalledZcodePluginVersion(cacheRoot)).toBeNull();
    });
  });
});

describe("formatZcodePluginVersionDoctorNote", () => {
  test("aligned", () => {
    expect(formatZcodePluginVersionDoctorNote("3.7.0", "3.7.0")).toBe("Plugin/CLI versions aligned (3.7.0).");
  });

  test("CLI newer: prompt the plugin update", () => {
    expect(formatZcodePluginVersionDoctorNote("3.8.0", "3.7.0")).toBe(
      "CLI 3.8.0 is newer than installed plugin 3.7.0 \u2014 update the Morning Star plugin in ZCode (Plugin Management \u2192 update from the mstar-local marketplace).",
    );
  });

  test("plugin newer: prompt the global CLI update", () => {
    expect(formatZcodePluginVersionDoctorNote("3.7.0", "3.8.0")).toBe(
      "Installed plugin 3.8.0 is newer than CLI 3.7.0 \u2014 update the global CLI: npm i -g @mstar-harness/cli@latest (or @3.8.0).",
    );
  });

  test("not installed: install hint without a drift direction", () => {
    expect(formatZcodePluginVersionDoctorNote("3.7.0", null)).toBe(
      "No installed Morning Star plugin found under ~/.zcode/cli/plugins/cache/ (install from the mstar-local marketplace).",
    );
  });

  test("prerelease-aware: a prerelease CLI is older than its release plugin", () => {
    expect(formatZcodePluginVersionDoctorNote("3.7.0-rc.1", "3.7.0")).toBe(
      "Installed plugin 3.7.0 is newer than CLI 3.7.0-rc.1 \u2014 update the global CLI: npm i -g @mstar-harness/cli@latest (or @3.7.0).",
    );
  });
});
