---
packages: root, cli
---

- **Marketplace manifests now pin the plugin version.** `.claude-plugin/marketplace.json` and the root `marketplace.json` carry `version` on the `morning-star-harness` plugin entry, and both manifests joined the release version surfaces — `release:prepare` bumps them at `plugins[0].version` and `release:validate` gates them there, so a ZCode marketplace refresh can detect newer releases.
- **ZCode bootstrap marketplace entry carries `version`.** The CLI seeds the entry from the local harness checkout's `.zcode-plugin/plugin.json`, falling back to the CLI package version when the marker is unreadable.

<!-- CN -->
- **Marketplace 清单现在固定插件版本。** `.claude-plugin/marketplace.json` 与根 `marketplace.json` 在 `morning-star-harness` 插件条目上携带 `version`，且两份清单加入发布版本面——`release:prepare` 在 `plugins[0].version` 处提升、`release:validate` 在同一路径把关，ZCode marketplace 刷新即可检测到新版本。
- **ZCode bootstrap marketplace 条目携带 `version`。** CLI 从本地 harness 检出的 `.zcode-plugin/plugin.json` 取值，标记不可读时回退 CLI 包版本。
