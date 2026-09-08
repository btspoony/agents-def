---
packages: root, engine, omp
---

- **ZCode coordination-write gate**: new engine-backed PreToolUse (`Write|Edit`) process hook `hooks/mstar-write-gate.mjs` — hard-enforced repos block writes to harness coordination documents (status.json, workflow snapshots, project registers) with exit 2 plus an actionable stderr reason (stdout stays empty); soft-mode and non-harness writes pass silently; disable per session with `MSTAR_WRITE_GATE=off`.
- **omp hook lazy loaders removed (versioned divergence)**: the engine is inlined at build, so a stale engine dist now fails the omp build instead of silently degrading; Gate-1 block/pass decisions and reason strings are unchanged (golden fixture matrix).

<!-- CN -->
- **ZCode 协调写入门禁**：新增引擎内置的 PreToolUse（`Write|Edit`）进程钩子 `hooks/mstar-write-gate.mjs` —— hard 模式仓库对 harness 协调文档（status.json、workflow 快照、项目登记）的写入以 exit 2 + 可操作的 stderr 理由拦截（stdout 恒为空）；soft 模式与非 harness 写入静默放行；可用 `MSTAR_WRITE_GATE=off` 按会话关闭。
- **omp 移除钩子懒加载（版本化分歧）**：引擎在构建期内联，过期的 engine dist 现在会让 omp 构建失败而非静默降级；Gate-1 的拦截/放行判定与理由字符串不变（golden fixture 矩阵验证）。
