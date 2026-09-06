---
packages: root, cli, dsh, engine
---

- Replaced static synthetic credentials in security tests with locally generated disposable values (random tokens, locally signed JWTs, in-memory RSA keys, ephemeral ssh-keygen OpenSSH keys), preserving every detection and redaction assertion. CLI coverage now also asserts a tracked token is found and its value never printed.
- Reworded the placeholder-masking comment in the engine audit source and the mstar-audit prompt-injection rules to state the invariant without quoting attack phrasing; paired before/after classification checks keep the defensive behavior identical.

<!-- CN -->
- 安全测试中的静态合成凭据改为本地生成的一次性值（随机 token、本地签名 JWT、内存 RSA 密钥、临时 ssh-keygen OpenSSH 密钥），全部检测与脱敏断言保留。CLI 覆盖新增断言：已跟踪 token 会被发现且输出永不回显其值。
- 引擎审计源码中的占位符掩码注释与 mstar-audit 提示注入规则改为直接陈述不变量，不再引用攻击话术；before/after 配对分类检查确认防御行为不变。
