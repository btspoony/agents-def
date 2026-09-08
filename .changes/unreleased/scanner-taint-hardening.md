---
packages: cli, root
---

- Hardened CLI path handling after a deep static-security scan: relative `--output` values containing `..` segments are now rejected instead of escaping the project root; agent-plugin install validation requires the plugin root to be a real directory and builds manifest/MCP/skill component paths by literal joins; lint target collection and tracked-file listing build child paths from guarded readdir entry names; owned PR-review artifact paths are constructed as single-segment names beside the worktree.
- skill-eval is now fully automated / test-driven: the argv CLI dispatchers (`scripts/skill-eval/index.ts`, the `manifest.ts` stage entry) were removed and the harness is invoked programmatically through its exported stage functions (`prepareManifest`, `executeManifest`, report builders); process spawn stays isolated in the `node-launch.ts` adapter with `manifest.cli.path` validated (absolute local path, no URL scheme or control characters) and realpath-normalized before launch; `canonicalJson` key ordering no longer relies on array `sort()` and is pinned by byte-stability equivalence tests.

<!-- CN -->
- 深度静态安全扫描后的 CLI 路径处理加固：含 `..` 段的相对 `--output` 现在被拒绝（此前可越出项目根）；agent-plugin 安装校验要求插件根为真实目录，manifest/MCP/skill 组件路径改为字面量拼接；lint 目标收集与 tracked 文件列举对 readdir 条目名做守卫后拼接；自有 PR review 工件路径按 worktree 旁单段名构造。
- skill-eval 全面转为自动化 / 测试驱动：移除 argv CLI 分发入口（`scripts/skill-eval/index.ts` 与 `manifest.ts` 的 stage 入口），各阶段改为经导出函数（`prepareManifest`、`executeManifest`、report 构建器）程序化调用；进程 spawn 仍隔离在 `node-launch.ts` 适配模块，`manifest.cli.path` 启动前校验（绝对本地路径、拒绝 URL scheme 与控制字符）并做 realpath 规范化；`canonicalJson` 键序不再依赖数组 `sort()`，并以字节稳定性等价测试钉住。
