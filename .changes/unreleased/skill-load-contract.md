---
category: Harness
packages: root
---

- Made **`mstar-roles` the single load-selection authority**: the roles hub owns the `Skill presets:` decision (identity-first; explicit `none` / omitted-standard / named preset / trivial routes; unknown preset refuses instead of guessing), and `mstar-harness-core` remains the lifecycle/authorization authority while pointing to the hub instead of mandating universal core reads.
- Made `Skill presets: none` coherent: role identity, the shared leaf safety boundary, and role-owned QC/QA evidence obligations stay reachable without optional topics; `none` never grants delegation or waives gates.
- Removed duplicated preset-interpretation prose from role references (each now lists only its preset members) and narrowed the Engine `lintLoadOrder` contract: the roles-hub bootstrap is the single recognized exception — arbitrary topic exemptions still fail.

<!-- CN -->
- 确立 **`mstar-roles` 为唯一加载选择权威**：角色 hub 拥有 `Skill presets:` 决策（身份优先；显式 `none` / 省略即 standard / 具名预设 / trivial 路由；未知预设直接拒绝而非猜测），`mstar-harness-core` 仍是生命周期/授权权威并指向 hub，不再要求所有专题无条件先读 core。
- 使 `Skill presets: none` 自洽：角色身份、共享 leaf 安全边界与角色自有 QC/QA 证据义务在不加载可选专题时依然可达；`none` 不授予委托、不豁免门禁。
- 移除各角色 reference 中重复的预设解释文字（各自仅保留成员清单），并收紧 Engine `lintLoadOrder` 契约：roles-hub bootstrap 是唯一被识别的例外——任意专题豁免仍然失败。
