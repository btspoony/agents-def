---
packages: root, cli, dsh, engine
---

- **One skill-lint classification policy across hosts**: CLI `mstar skill lint`, dsh skill-lint gate and drift Guard 5 now consume the shared Engine classifier `classifySkillLint` (exact `mstar-harness-core` → five-question exempt, `mstar-skill-authoring` → strict authoring, other `mstar-*` → runtime aliases, everything else → strict authoring). Identity is the resolved skill-directory basename — never the YAML `name` — so shipped runtime skills no longer receive conflicting dsh/CLI judgments; frontmatter and ephemeral-citation checks stay active in every profile and dsh content-blind repair behavior is unchanged.
- **Real-corpus parity + drift sensitivity evidence**: before/after lint decisions recorded on the shipped corpus (pre-fix dsh failed 15/20 `mstar-*` skills in authoring mode; candidate dsh, CLI and Guard 5 all pass the 18 runtime skills with 0 violations), plus red probes proving an intentionally mismatched classification or a removed real heading fails the corpus guard.

<!-- CN -->
- **跨宿主统一的 skill lint 分类策略**：CLI `mstar skill lint`、dsh skill-lint 门禁与 drift Guard 5 改为消费共享 Engine 分类器 `classifySkillLint`（精确 `mstar-harness-core` → 五问豁免，`mstar-skill-authoring` → 严格 authoring，其余 `mstar-*` → runtime 别名表，其它一律严格 authoring）。身份取自已解析的技能目录 basename，而绝非 YAML `name`，已交付的 runtime 技能不再得到互相矛盾的 dsh/CLI 判定；frontmatter 与 ephemeral-citation 检查在所有 profile 下保持生效，dsh 内容盲修复行为不变。
- **真实语料一致性 + 漂移敏感性证据**：在已交付语料上记录修改前后真实 lint 判定（修复前 dsh 以 authoring 模式误判 15/20 个 `mstar-*` 技能；候选实现下 dsh、CLI 与 Guard 5 对 18 个 runtime 技能全部通过、0 违规），并以红探针证明：故意错配的分类或删除真实标题都会使语料守卫变红。
