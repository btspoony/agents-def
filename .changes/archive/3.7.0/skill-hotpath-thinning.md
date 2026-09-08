---
category: Harness
packages: root
---

- **Evidence-gated hot-path skill thinning**: removed duplicated and model-native generic guidance from the four standard-preset hot-path files (`mstar-harness-core`, `mstar-coding-behavior`, `mstar-dispatch-gates`, `mstar-roles/_shared/leaf-executor-core.md`) — 8 bounded ablation batches, −8,419 bytes (−14.5%) on the subject-file set — with every removal row carrying provenance, a removal basis, a restore record, and a surviving owner in the frozen `scripts/skill-eval/ablations.json` inventory.
- **Behavior evidence recorded, not claimed**: each batch was adopted only after a fixed paired dev run showed zero new critical (authorization / wrong-checkout / false-pass) failures and no normal-success regression (17/20 vs 17/20 passes); the final candidate was re-frozen (baseline `c4e338a0`, candidate `4a750601`) for the interleaved three-repeat baseline/candidate/minimal comparison with heldout grades reserved for independent QA adjudication. Token-level load effect stays unverified (`usageBasis=unknown`); no efficacy or cost claim is made.
- **Protected semantics untouched**: user policies #109/#144/#153/#156/#167, the engine-legacy conditional archive, engine-absent fallback reachability under `Skill presets: none`, and all negative-constraint owners are preserved and pinned by `scripts/skill-eval/closure.test.ts` (24 tests); `validation:drift` stays exit 0.

<!-- CN -->
- **证据门控的热路径技能瘦身**：从四个 standard 预设热路径文件（`mstar-harness-core`、`mstar-coding-behavior`、`mstar-dispatch-gates`、`mstar-roles/_shared/leaf-executor-core.md`）移除重复规则与模型原生通用教学内容——8 个有界消融批次，主体文件集合 −8,419 字节（−14.5%）——每条移除行都在冻结的 `scripts/skill-eval/ablations.json` 清单中携带来源、移除依据、恢复记录与存活属主。
- **记录行为证据而不作断言**：每个批次仅在固定配对 dev 运行显示零新增 critical（授权 / 错误检出 / 假通过）失败且无正常成功回归（17/20 对 17/20）后才采纳；最终候选已重新冻结（基线 `c4e338a0`、候选 `4a750601`），用于 baseline/candidate/minimal 三次重复交错对比，heldout 评分留给 QA 独立裁决。token 级负载效应仍未验证（`usageBasis=unknown`）；不作任何效力或成本断言。
- **受保护语义不动**：用户政策 #109/#144/#153/#156/#167、engine-legacy 条件档案、`Skill presets: none` 下的 engine-absent 回退可达性、以及所有负向约束属主全部保留并由 `scripts/skill-eval/closure.test.ts`（24 个测试）锚定；`validation:drift` 保持 exit 0。
