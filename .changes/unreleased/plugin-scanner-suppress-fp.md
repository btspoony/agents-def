---
packages: root
---

- Added a repo-root **`.plugin-scanner.toml`** downgrading `SHELL_INJECTION_PATTERN` and `UNICODE_OBFUSCATED_INSTRUCTION` to `medium` — both verified false positives under the legacy scanner stack (`plugin-scanner` 2.0.1116 + `cisco-ai-skill-scanner` 2.0.14) pinned by the awesome-ai-plugins listing action: `RegExp#exec` regex matching, structured-argv `Bun.spawnSync` in a test, and ordinary Chinese text in bilingual skill docs. Findings stay visible; only the legacy stack's `high` gate is unblocked. Our pinned stack (scanner 3.0.104 + cisco 2.0.12) already reports zero high.

<!-- CN -->
- 新增仓库根 **`.plugin-scanner.toml`**，将 `SHELL_INJECTION_PATTERN` 与 `UNICODE_OBFUSCATED_INSTRUCTION` 降级为 `medium`——在 awesome-ai-plugins 列举动作锁定的旧扫描栈（`plugin-scanner` 2.0.1116 + `cisco-ai-skill-scanner` 2.0.14）下二者均为已核实的误报：`RegExp#exec` 正则匹配、测试中的结构化 argv `Bun.spawnSync`、双语文档中的普通中文文本。发现项保持可见，仅解除旧栈的 `high` 门禁；我们的锁定栈（scanner 3.0.104 + cisco 2.0.12）本就零 high。
