---
packages: root, cli
---

- **Marketplace manifests now pin the plugin version.** `.claude-plugin/marketplace.json` and the root `marketplace.json` carry `version` on the `morning-star-harness` plugin entry, and both manifests joined the release version surfaces — `release:prepare` bumps them at `plugins[0].version` and `release:validate` gates them there, so a ZCode marketplace refresh can detect newer releases.
- **ZCode bootstrap marketplace entry carries `version`.** The CLI seeds the entry with the CLI release version; ZCode's marketplace refresh overwrites the seed with the repo-shipped manifest. Doctor deliberately does not gate on version skew — a snapshot newer or older than the installed CLI is the update signal itself, not an unhealthy marketplace.

<!-- CN -->
- **Marketplace 清单现在固定插件版本。** `.claude-plugin/marketplace.json` 与根 `marketplace.json` 在 `morning-star-harness` 插件条目上携带 `version`，且两份清单加入发布版本面——`release:prepare` 在 `plugins[0].version` 处提升、`release:validate` 在同一路径把关，ZCode marketplace 刷新即可检测到新版本。
- **ZCode bootstrap marketplace 条目携带 `version`。** CLI 以 CLI 发布版本作为种子；ZCode marketplace 刷新会用仓库随附清单覆盖种子。doctor 有意不按版本偏差把关——快照比已装 CLI 新或旧正是更新信号本身，而非异常状态。
