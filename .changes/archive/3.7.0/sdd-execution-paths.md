---
packages: root, cli, engine
---

- SDD handoffs now carry an absolute destination contract: fresh/resume/reviewer prompts cite the absolute control harness root, feature worktree/cwd, plan, brief/report and context file; native hosted subagents observe pwd/branch before writing, and the handoff states explicitly that a later deliberate `chdir`, absolute-path write, or host-native edit tool (`apply_patch`) is not blocked.
- New bound SDD execution surface (spec A3): `mstar sdd exec --context <context.json> -- <argv>` launches CLI children with cwd bound to the feature worktree (no shell, exit 1 gate / 2 usage / 127 not-found / 128+n signals); `mstar sdd check-context` gates `source|artifact|launch` seams; `task-brief`/`review-package` accept `--context` to validate destinations before mkdir/write and emit absolute paths. A causal replay suite reruns the historical relative-source write raw (wrong-primary reproduced) vs bound (feature-only) on disposable fixtures.
- Engine exports: `resolveSddExecutionContext`, `checkSddAction`, `runInSddContext` — bounded action checks reusing the existing lease/branch/path machinery; no new global hardening and no sandbox claim.

<!-- CN -->
- SDD 交接统一携带绝对目的地契约：fresh/resume/审查者提示模板写明绝对控制根、feature worktree/cwd、plan、brief/report 与 context 文件路径；原生托管子代理先观察 pwd/分支再写入，并明确声明后续主动 `chdir`、绝对路径写入或宿主原生编辑工具（`apply_patch`）不被拦截。
- 新增绑定 SDD 执行面（spec A3）：`mstar sdd exec --context <context.json> -- <argv>` 以 feature worktree 为子进程起始 cwd（无 shell，退出码 1 门禁 / 2 用法 / 127 未找到 / 128+n 信号）；`mstar sdd check-context` 门禁 `source|artifact|launch` 动作；`task-brief`/`review-package` 支持 `--context` 先校验目的地再写入并输出绝对路径。新增因果重放套件：同一相对路径写入器 raw 启动复现错写 primary、绑定启动仅改 feature（全部使用一次性 fixture）。
- Engine 新增导出：`resolveSddExecutionContext`、`checkSddAction`、`runInSddContext` —— 复用既有 lease/branch/path 机制的有界动作检查；无全局加固，不做沙箱声明。
