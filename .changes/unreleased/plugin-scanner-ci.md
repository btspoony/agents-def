---
packages: root, dsh
---

- Added an advisory HOL Plugin Security Scan workflow for pull requests, main-branch pushes, and manual runs, with a pinned Action, explicit Cisco skill analysis, an 80-point/high-severity target, and reports preserved on threshold failure. Repository-owned suppressions remain untrusted.
- Included the MIT license and a link to the shared security disclosure policy in the dsh package distribution.

<!-- CN -->
- 新增 advisory HOL Plugin Security Scan workflow，覆盖 PR、main 分支推送及手动触发；固定 Action 版本，显式启用 Cisco 技能分析，以 80 分及 high 严重度为阈值，未达阈值时仍保留报告，不信任仓库自带的告警豁免。
- dsh 分发包包含 MIT 许可证及统一安全漏洞报告政策的链接。
