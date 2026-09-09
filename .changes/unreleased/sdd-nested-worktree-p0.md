---
packages: root, engine, cli
---

- **Worktree gates now distinguish Git checkout identity from physical path nesting.** A real linked worktree created inside the control checkout (the documented `.worktrees` layout) passes the L1 pre-dispatch check and the bound SDD execution context; the same control checkout, a plain subdirectory of it, or a symlink alias of it is refused — even when the declared branch equals the control branch. Git-probe failure fails closed with the existing bounded timeout.
- **The control checkout root is derived by git probe, not `dirname(harness)`.** `resolveSddExecutionContext` resolves the real repository top-level of the declared harness root (`git rev-parse --show-toplevel`, bounded and fail-closed), so a `.mstarc`/override nested harness like `<control>/state/.mstar` gates the same-checkout isolation identically in standalone and active-lease contexts; an unresolvable root fails closed.
- **One shared checkout-identity predicate.** `l1PreDispatchCheck`, `assertControlVsFeaturePath` and `resolveSddExecutionContext` (the `sdd.context.feature-in-control` gate) share `isDistinctCheckout` (canonical per-worktree git dir comparison) — no `.worktrees` name special-case, no duplicated containment rule, and the control-harness-inside-feature, path-escape, lease and branch protections are unchanged.

<!-- CN -->
- **Worktree 门禁现在区分 Git checkout 身份与物理路径嵌套。** 位于 control checkout 内的真实 linked worktree（文档化的 `.worktrees` 布局）通过 L1 预派发检查与 bound SDD 执行上下文；同一 control checkout、其普通子目录或 symlink 别名即使声明分支与 control 分支相同也被拒绝。Git 探测失败沿用既有有界超时 fail-closed。
- **control checkout 根由 git 探测推导，而非 `dirname(harness)`。** `resolveSddExecutionContext` 解析声明 harness 根的真实仓库 top-level（`git rev-parse --show-toplevel`，有界且 fail-closed），因此 `.mstarc`/override 嵌套 harness（如 `<control>/state/.mstar`）在 standalone 与 active-lease 上下文中以相同方式把关同 checkout 隔离；无法解析的根 fail-closed。
- **单一共享 checkout 身份判定。** `l1PreDispatchCheck`、`assertControlVsFeaturePath` 与 `resolveSddExecutionContext`（`sdd.context.feature-in-control` 门禁）共享 `isDistinctCheckout`（按 canonical per-worktree git dir 比较）——无 `.worktrees` 名称特判、无重复 containment 规则，control-harness-inside-feature、路径逃逸、lease 与分支保护保持不变。
