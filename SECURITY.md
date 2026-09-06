# Security Policy

## Supported versions

Security fixes target the latest stable release of Morning Star Harness and its
`@mstar-harness/*` packages. Upgrade older releases before checking whether a
reported issue still applies. Prereleases are for evaluation, not supported
production deployments.

## Reporting a vulnerability

Email **tech@btang.cn** with the subject `mstar-harness security report`.
Do not open a public issue or pull request containing exploit details, credentials,
or private repository content.

Include the affected package and version (or commit), host and operating system,
reproduction steps, expected and observed behavior, and potential impact. Use
synthetic credentials and a minimal reproduction; never send live secrets.
Coordinate disclosure with the maintainer while the report is investigated and a
fix or mitigation is prepared. Ordinary bugs and feature requests belong in
[GitHub Issues](https://github.com/btspoony/mstar-harness/issues).

## Security boundaries

Morning Star coordinates coding agents and enforces workflow gates; it is not a
sandbox. Host permissions and approval controls remain the security boundary for
file access, commands, network access, and credentials. Keep those controls enabled,
review third-party plugins before installing them, and use least-privilege tokens.
A passing workflow or scanner result is not a guarantee that a plugin is safe.

## 中文

安全修复面向 Morning Star Harness 及 `@mstar-harness/*` 包的最新稳定版本。
旧版本请先升级；预发布版本仅供评估，不作为受支持的生产部署。

请将漏洞报告发送至 **tech@btang.cn**，邮件主题为 `mstar-harness security report`。
请勿在公开 issue 或 PR 中披露利用细节、凭据或私有仓库内容。报告应包含受影响的包与版本
（或 commit）、宿主与操作系统、复现步骤、预期和实际行为以及潜在影响。使用虚构凭据和
最小复现，切勿发送真实密钥。调查及修复期间请与维护者协调披露；普通缺陷和功能请求使用
[GitHub Issues](https://github.com/btspoony/mstar-harness/issues)。

Morning Star 的工作流门禁不是沙箱。文件、命令、网络和凭据访问仍由宿主权限与审批控制
约束；请保留这些控制，安装前审查第三方插件，并使用最小权限令牌。工作流或扫描通过不
代表插件没有安全风险。
