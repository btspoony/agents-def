---
packages: root, engine, omp
---

- **ZCode coordination-write gate**: new engine-backed PreToolUse (`Write|Edit`) process hook `hooks/mstar-write-gate.mjs` — hard-enforced repos block writes to harness coordination documents (status.json, workflow snapshots, project registers) with exit 2 plus an actionable stderr reason (stdout stays empty); soft-mode and non-harness writes pass silently; disable per session with `MSTAR_WRITE_GATE=off`.
- **Edits validate the reconstructed post-edit result (ZCode host)**: deterministic Edits (`old_string` + `new_string` with a unique match, or `replace_all`) are validated against the reconstructed content instead of the pre-edit on-disk state — a deterministic corrupting edit now blocks under hard enforcement; ambiguous or non-reconstructible edits keep the pre-edit fallback.
- **Oversized coordination docs are now a violation on the ZCode host**: content or on-disk targets beyond the 2 MiB validation budget yield `status.oversized` (hard-mode block naming the escape hatch instead of a silent pass; omp keeps the default silent pass).
- **omp hook lazy loaders removed (versioned divergence)**: the engine is inlined at build, so a stale engine dist now fails the omp build instead of silently degrading; Gate-1 block/pass decisions and reason strings are unchanged (golden fixture matrix).

<!-- CN -->
- **ZCode 协调写入门禁**：新增引擎内置的 PreToolUse（`Write|Edit`）进程钩子 `hooks/mstar-write-gate.mjs` —— hard 模式仓库对 harness 协调文档（status.json、workflow 快照、项目登记）的写入以 exit 2 + 可操作的 stderr 理由拦截（stdout 恒为空）；soft 模式与非 harness 写入静默放行；可用 `MSTAR_WRITE_GATE=off` 按会话关闭。
- **编辑校验重构后的结果（ZCode 宿主）**：确定性编辑（`old_string` + `new_string` 唯一匹配，或 `replace_all`）现在校验重构后的内容而非编辑前落盘状态 —— 确定性的破坏性编辑在 hard 模式下会被拦截；歧义或不可重构的编辑保持编辑前回退。
- **超大协调文档在 ZCode 宿主上现为违规**：超过 2 MiB 校验预算的内容或落盘目标产生 `status.oversized`（hard 模式拦截并在理由中给出逃生口，而非静默放行；omp 保持默认静默放行）。
- **omp 移除钩子懒加载（版本化分歧）**：引擎在构建期内联，过期的 engine dist 现在会让 omp 构建失败而非静默降级；Gate-1 的拦截/放行判定与理由字符串不变（golden fixture 矩阵验证）。
