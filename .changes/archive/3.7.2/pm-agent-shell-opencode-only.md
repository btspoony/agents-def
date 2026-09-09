---
packages: root, opencode, omp, dsh
---

- Moved the `mode: primary` **`project-manager`** agent shell out of the shared `agents/` subagent surface into `packages/opencode/agents/` (OpenCode-only). Host plugin surfaces (ZCode / omp / Claude-plugin manifests) no longer register PM as a subagent — PM entry stays via the `pm` skill; OpenCode bundling merges the shell into `harness-agents/`.
- Updated omp/dsh mirror contracts and host docs to match.

<!-- CN -->
- 将 `mode: primary` 的 **`project-manager`** agent shell 从共享 `agents/` subagent 目录迁出，移至 `packages/opencode/agents/`（仅 OpenCode 使用）。各宿主插件面（ZCode / omp / Claude-plugin manifest）不再把 PM 注册为 subagent——PM 入口保持 `pm` skill；OpenCode bundle 时并入 `harness-agents/`。
- 同步更新 omp/dsh 镜像契约与宿主文档。
