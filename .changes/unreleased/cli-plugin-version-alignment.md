---
packages: root, cli
---

- **CLI ↔ plugin version drift is now visible in one command**: `mstar-harness doctor --target zcode` compares the running CLI version against the installed ZCode Morning Star plugin (`~/.zcode/cli/plugins/cache/<marketplace>/morning-star-harness/<version>/`, highest semver wins) and prints a directional prompt — CLI newer → update the plugin from the mstar-local marketplace, plugin newer → update the global CLI (`npm i -g @mstar-harness/cli@latest`) — as an informational note that never becomes a doctor error or changes the exit code; the harness skills (`mstar-harness-core` version-drift contract + `mstar-host` zcode reference) document when to run the check and which side to update.

<!-- CN -->
- **CLI 与插件版本漂移一条命令即可发现**：`mstar-harness doctor --target zcode` 对比运行中的 CLI 版本与 ZCode 已安装的 Morning Star 插件版本（`~/.zcode/cli/plugins/cache/<marketplace>/morning-star-harness/<version>/`，多个版本取最高 semver），并按方向给出更新提示——CLI 较新 → 从 mstar-local marketplace 更新插件，插件较新 → 更新全局 CLI（`npm i -g @mstar-harness/cli@latest`）——仅为信息性 note，不会成为 doctor 错误、也不改变退出码；harness 技能（`mstar-harness-core` 版本漂移契约 + `mstar-host` zcode 参考）记录了何时执行该检查以及应更新哪一侧。
