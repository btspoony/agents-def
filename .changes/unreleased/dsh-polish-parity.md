---
packages: dsh
---

- **`rolePersonas` docs now state the merge semantics explicitly.** The Config JSDoc and the README config table spell out all three cases unambiguously: the request's own `persona` wins as-is (caller intent is never overridden — no role merge), a non-empty entry beats the bundled `harness-agents/` mirror default, and an **empty-string** entry is treated as unset and falls through to the mirror default — documentation only, persona resolution behavior unchanged.
- **Seed mirror views are compile-tied to the real fallbacks types.** A dedicated typegate spec (run by `typecheck:tests`, the same channel as the existing service-view gate) asserts the mstar seed mirror views stay assignable from the real `dsh-llm-fallbacks` module shapes — drift fails the typecheck, not a runtime dispatch; `packages/dsh/src/` keeps zero runtime and zero type imports of the fallbacks package.
- **Skill-lint runtime-mode parity is pinned by tests** on the canonical fixture rows (`classifySkillLint` routes `mstar-*` ids to the runtime profile; `lintFiveQuestion` receives `profile.mode`), closing the stale roadmap observation; the `fallbacks-decoration` fixture-flake observation is closed as obsolete (the spec no longer exists).
- **The `rolePersonaAgentsDir` module sink lifetime is documented and pinned by a re-bind test** (one plugin row per process; the per-apply `setRolePersonaAgentsDir` call is the re-bind/reset and also resets the mirror-absent latch) — no refactor, persona delivery semantics unchanged.

<!-- CN -->
- **`rolePersonas` 文档现明确写出合并语义。** Config JSDoc 与 README 配置表无歧义地列出三种情形：请求自身携带的 `persona` **原样生效**（调用方意图绝不被覆盖——不做角色合并）、非空条目优先于打包的 `harness-agents/` 镜像默认值、**空字符串**条目视为未设置并回落到镜像默认值——仅文档改动，persona 解析行为不变。
- **种子镜像视图与真实 fallbacks 类型建立编译期绑定。** 专用 typegate spec（经 `typecheck:tests` 运行，与既有 service-view 门同一通道）断言 mstar 种子镜像视图仍可从真实 `dsh-llm-fallbacks` 模块形状赋值——漂移让类型检查失败而非运行时派发；`packages/dsh/src/` 保持对 fallbacks 包零运行时、零类型导入。
- **skill-lint runtime-mode parity 以测试钉死**（在规范 fixture 行上验证 `classifySkillLint` 将 `mstar-*` id 路由到 runtime profile 且 `lintFiveQuestion` 接收 `profile.mode`），关闭陈旧 roadmap 观察；`fallbacks-decoration` fixture-flake 观察以过时关闭（该 spec 已不存在）。
- **`rolePersonaAgentsDir` 模块级 sink 的生命周期已有文档与 re-bind 测试钉死**（每进程一行插件；每次 apply 的 `setRolePersonaAgentsDir` 调用即 re-bind/reset，并重置镜像缺失 latch）——不重构，persona 交付语义不变。
