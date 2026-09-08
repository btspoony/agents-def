---
category: Harness
packages: root, cli
---

- ZCode plugin cards now show the Morning Star **icon and display name**: the repo-shipped marketplace manifests (`.claude-plugin/marketplace.json`, root `marketplace.json`) and the CLI `zcode` bootstrap snapshot carry `icon` + `displayName` for the `morning-star-harness` entry.
- Bundled **ZCode plugin hooks** (`hooks/hooks.json`): **SessionStart** injects a compact harness-workspace context ({HARNESS_DIR} + `status.json` summary + `mstar-harness-core` load pointer; silent no-op outside harness workspaces), and **PreToolUse (Bash)** adds a deterministic git gate backing `mstar-branch-worktree` — blocks direct commits on the default protected branch (`MSTAR_ALLOW_DEFAULT_BRANCH_COMMIT=1` escape) and bare `git push --force` (`--force-with-lease` required; `MSTAR_BRANCH_GUARD=off` disables the hook).
- Documented the icon + hooks behavior in `INSTALL.md` (ZCode sections) and `mstar-host` → `references/zcode.md`.

<!-- CN -->
- ZCode 插件卡片现在显示 Morning Star **图标与显示名称**：仓库自带的两份 marketplace 清单（`.claude-plugin/marketplace.json`、根 `marketplace.json`）与 CLI `zcode` 引导快照均在 `morning-star-harness` 条目上补齐 `icon` + `displayName`。
- 内置 **ZCode 插件 hooks**（`hooks/hooks.json`）：**SessionStart** 在检测到 harness 工作区时注入一行上下文（{HARNESS_DIR} + `status.json` 摘要 + `mstar-harness-core` 加载指引；非 harness 工作区静默跳过）；**PreToolUse (Bash)** 为 `mstar-branch-worktree` 增加确定性 git 门禁——拦截默认保护分支上的直接 commit（逃生口 `MSTAR_ALLOW_DEFAULT_BRANCH_COMMIT=1`）与裸 `git push --force`（必须用 `--force-with-lease`；`MSTAR_BRANCH_GUARD=off` 可整体关闭）。
- 图标与 hooks 行为已同步写入 `INSTALL.md`（ZCode 章节）与 `mstar-host` → `references/zcode.md`。
