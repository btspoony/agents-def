/**
 * Compile-time tie for the seed mirror views.
 *
 * Every seed-mirror `*View` in `src/gates/fallbacks-structural.ts` must
 * stay assignable FROM the real `dsh-llm-fallbacks` type. The assertions
 * are checked ONLY by the tests' compile program (`bun run typecheck:tests`),
 * which resolves the real package's type exports — the same channel as the
 * existing service-view gate (the uncast `ctx.get('llm-fallbacks')` return
 * compiled against the real service type in `fallbacks-probe.spec.ts`).
 * A drifted mirror (field removed / renamed / retyped, or a widened
 * upstream union) fails `typecheck:tests` with the drifted pair named.
 *
 * Type-only by design (see the `fallbacks-structural.ts` header invariant):
 * the published package carries ZERO runtime AND ZERO type references to
 * `dsh-llm-fallbacks`. The real types enter as erased type-only imports and
 * the gate consts are `null` at runtime — no runtime dependency is added,
 * and this gate lives under `tests/` only.
 */
import { describe, expect, it } from 'bun:test'
import type {
  EffectiveRole,
  EffectiveRolesReadback,
  SeedConflict,
  SeedDeclaration,
  SeedDeclareOutcome,
  SeedSkipReason as RealSeedSkipReason,
} from 'dsh-llm-fallbacks'
import type {
  EffectiveRoleView,
  EffectiveRolesReadbackView,
  SeedConflictView,
  SeedDeclarationView,
  SeedDeclareOutcomeView,
  SeedSkipReason,
} from '../src/gates/fallbacks-structural.ts'

/**
 * Real → view assignability gates, in `fallbacks-structural.ts` declaration
 * order. The double cast through `unknown` keeps the assertions
 * compile-time-only: nothing is constructed and no value crosses the
 * package boundary at runtime.
 */
const _gate_SeedSkipReason: SeedSkipReason = (null as unknown) as RealSeedSkipReason
const _gate_SeedDeclarationView: SeedDeclarationView = (null as unknown) as SeedDeclaration
const _gate_SeedConflictView: SeedConflictView = (null as unknown) as SeedConflict
const _gate_SeedDeclareOutcomeView: SeedDeclareOutcomeView = (null as unknown) as SeedDeclareOutcome
const _gate_EffectiveRoleView: EffectiveRoleView = (null as unknown) as EffectiveRole
const _gate_EffectiveRolesReadbackView: EffectiveRolesReadbackView = (null as unknown) as EffectiveRolesReadback

describe('fallbacks structural type gate', () => {
  it('seed mirror views are compile-tied to the real dsh-llm-fallbacks types (assertions run under typecheck:tests)', () => {
    // The gate consts hold `null` at runtime — the real assertions live in
    // the type checker's world (see file header).
    expect(_gate_SeedDeclarationView).toBeNull()
  })
})
