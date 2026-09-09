/**
 * compareSemver — prerelease-aware semver 2.0.0 comparison for the CLI's
 * plugin/CLI version-alignment doctor note. Semantics are mirrored from
 * `scripts/release-surfaces.ts` (the semantics source of truth).
 */
import { describe, expect, test } from "bun:test";
import { compareSemver as scriptsCompareSemver } from "../../../scripts/release-surfaces";
import { compareSemver } from "../src/version-compare";

describe("compareSemver", () => {
  test("equal versions compare 0", () => {
    expect(compareSemver("3.7.0", "3.7.0")).toBe(0);
    expect(compareSemver("1.2.3-alpha.1", "1.2.3-alpha.1")).toBe(0);
  });

  test("core fields: major, minor, patch each decide the order", () => {
    expect(compareSemver("4.0.0", "3.9.9")).toBeGreaterThan(0);
    expect(compareSemver("3.8.0", "3.7.9")).toBeGreaterThan(0);
    expect(compareSemver("3.7.1", "3.7.0")).toBeGreaterThan(0);
    expect(compareSemver("3.7.0", "4.0.0")).toBeLessThan(0);
    expect(compareSemver("3.7.0", "3.8.0")).toBeLessThan(0);
    expect(compareSemver("3.7.0", "3.7.1")).toBeLessThan(0);
  });

  test("prerelease precedence (§11): identifiers numeric then alphanumeric", () => {
    expect(compareSemver("1.0.0-alpha", "1.0.0-alpha.1")).toBeLessThan(0);
    expect(compareSemver("1.0.0-alpha.1", "1.0.0-alpha.beta")).toBeLessThan(0);
    expect(compareSemver("1.0.0-alpha.beta", "1.0.0-beta")).toBeLessThan(0);
    expect(compareSemver("1.0.0-beta", "1.0.0-beta.2")).toBeLessThan(0);
    expect(compareSemver("1.0.0-beta.2", "1.0.0-beta.11")).toBeLessThan(0);
    expect(compareSemver("1.0.0-beta.11", "1.0.0-rc.1")).toBeLessThan(0);
    expect(compareSemver("1.0.0-rc.1", "1.0.0")).toBeLessThan(0);
  });

  test("release outranks any prerelease of the same core; numeric < alphanumeric", () => {
    expect(compareSemver("3.7.0", "3.7.0-rc.1")).toBeGreaterThan(0);
    expect(compareSemver("3.7.0-rc.1", "3.7.0")).toBeLessThan(0);
    expect(compareSemver("1.0.0-1", "1.0.0-alpha")).toBeLessThan(0);
  });

  // F-002 drift guard: version-compare.ts is a deliberate CLI-local mirror of
  // the scripts comparator (scripts/ is not a package export). This fixed
  // vector turns the in-code "keep in sync" comment into an enforced
  // invariant — any semantic divergence between the two implementations
  // fails here. Includes the canonical semver §11 chain, core-field ordering,
  // release-vs-prerelease, and a leading-zero prerelease numeric (both
  // implementations compare numerics via BigInt, so `01` == `1` deterministically).
  test("agrees with the scripts/release-surfaces.ts comparator on a fixed vector", () => {
    const vectors: Array<[string, string]> = [
      ["3.7.0", "3.7.0"],
      ["4.0.0", "3.9.9"],
      ["3.8.0", "3.7.9"],
      ["3.7.1", "3.7.0"],
      ["1.0.0-alpha", "1.0.0-alpha.1"],
      ["1.0.0-alpha.1", "1.0.0-alpha.beta"],
      ["1.0.0-alpha.beta", "1.0.0-beta"],
      ["1.0.0-beta.2", "1.0.0-beta.11"],
      ["1.0.0-beta.11", "1.0.0-rc.1"],
      ["1.0.0-rc.1", "1.0.0"],
      ["1.0.0-1", "1.0.0-alpha"],
      ["3.7.0-01", "3.7.0-1"],
    ];
    for (const [a, b] of vectors) {
      expect(Math.sign(compareSemver(a, b))).toBe(Math.sign(scriptsCompareSemver(a, b)));
    }
  });
});
