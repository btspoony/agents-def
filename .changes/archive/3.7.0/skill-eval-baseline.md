---
category: Harness
packages: root
---

- Added a **maintenance-only skill evaluation harness** under `scripts/skill-eval/`: a frozen 30-case corpus (5 routes x 6, dev4/heldout2, first-run/resume and false-pass/wrong-checkout traps), an immutable manifest `prepare` stage (zero model calls, exit 0/2), an argv-array subprocess `run` stage (real CLI execution, evidence capture, resumable scheduler, honest pass/fail/unverified/infrastructure grading with exit 0/1/2), and a `report` stage that aggregates recorded evidence without rerunning a model.
- Real smoke baseline recorded: harness mechanics verified on codex-cli 0.144.1 (closure-sentinel reads, isolated workspace-write diffs, exact session-id resume); observed model identity absent from event streams and usage attribution left unverified — both recorded as explicit nulls, so no fixed-model efficacy claim is made.

<!-- CN -->
- 新增 **仅维护用的技能评估基线工具**（`scripts/skill-eval/`）：冻结的 30 条用例语料（5 条路由 x 6，每路由 dev4/heldout2，含首跑/续跑与假通过/错检出陷阱）、零模型调用的不可变 manifest `prepare` 阶段（exit 0/2）、argv 数组子进程 `run` 阶段（真实 CLI 执行、证据留档、可恢复调度，pass/fail/unverified/infrastructure 诚实判级，exit 0/1/2），以及不重跑模型的 `report` 汇总阶段。
- 已记录真实冒烟基线：在 codex-cli 0.144.1 上验证了工具机制（闭包哨兵读取、workspace-write 隔离写入、精确 session-id 续跑）；事件流中无观测模型身份、用量归属未验证——两者均以显式 null 留档，不做任何固定模型疗效声明。
