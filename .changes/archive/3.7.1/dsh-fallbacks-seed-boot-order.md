---
packages: dsh
---

- **dsh fallbacks seeds now converge on boot.** The mstar role-seed declaration survives the provider's apply window: a transient `seeds: settings service is unavailable` reject is retried (3 attempts across the provider's apply window) instead of failing the boot declaration, an ultimately-failed declaration logs exactly one terminal error while the decision-point retry stays available, and the adoption advisory arms only after a converged re-declare — no manual `roles.list` edit is needed for the 13 seeded mstar roles.

<!-- CN -->
- **dsh fallbacks 角色种子现在 boot 即收敛。** mstar 角色 seed 声明可在上游 apply 窗口内存活：`seeds: settings service is unavailable` 的暂时性拒绝会被重试（跨上游 apply 窗口的 3 次尝试）而不再使 boot 声明失败；最终失败只记录恰好一条终态错误，且决策点 retry 仍可用；adoption advisory 仅在 re-declare 收敛后才置位——13 个 mstar seeded 角色无需手动编辑 `roles.list`。
