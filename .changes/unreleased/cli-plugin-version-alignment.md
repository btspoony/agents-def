---
packages: root, cli
---

- **CLI ↔ plugin version drift is now visible in one command, for every supported host**: `mstar-harness doctor --target <host>` compares the running CLI version against the installed Morning Star plugin with per-host local discovery (opencode package cache, cursor plugin checkout manifest, codex/omp `plugin list --json`, zcode plugin cache, dsh profile node_modules across all profiles, kimi `$KIMI_CODE_HOME/plugins/managed`; highest semver wins) and prints one directional prompt — CLI newer → per-host plugin update hint, plugin newer → update the global CLI (`npm i -g @mstar-harness/cli@latest`) — as an informational note that never becomes a doctor error or changes the exit code; the `mstar-harness-core` version-drift contract now states all-host coverage.
- `kimi` joins the supported install targets with a minimal adapter: doctor reports the resolved `$KIMI_CODE_HOME/plugins/managed` location without requiring the kimi binary; init is notes-only — plugin install and update go through the Kimi TUI `/plugins install`.

<!-- CN -->
- **CLI 与插件版本漂移一条命令即可发现，覆盖全部受支持宿主**：`mstar-harness doctor --target <host>` 通过各宿主本地发现（opencode 包缓存、cursor 插件检出清单、codex/omp `plugin list --json`、zcode 插件缓存、dsh 全部 profile 的 node_modules、kimi 的 `$KIMI_CODE_HOME/plugins/managed`；多个版本取最高 semver）对比运行中的 CLI 版本与已安装的 Morning Star 插件版本，并按方向给出一条提示——CLI 较新 → 各宿主的插件更新提示，插件较新 → 更新全局 CLI（`npm i -g @mstar-harness/cli@latest`）——仅为信息性 note，不会成为 doctor 错误、也不改变退出码；`mstar-harness-core` 版本漂移契约已更新为全宿主覆盖。
- `kimi` 以最小适配器加入受支持安装目标：doctor 报告解析后的 `$KIMI_CODE_HOME/plugins/managed` 位置且不要求 kimi 二进制存在；init 仅输出提示——插件安装与更新经 Kimi TUI 的 `/plugins install` 完成。
