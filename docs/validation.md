# 验证记录

[返回 README](../README.md) · [浏览器](browser.md) · [移动端](mobile.md)

本页记录具体环境中的检查范围。工具能启动、技能能被发现，以及某个平台的内容能否读全，分别验证。原始日志、设备信息与浏览器状态保存在仓库外。

## 2026-10-30

环境：macOS arm64，Node.js 24.22.2，Chrome 156。浏览器上游固定为 `chrome-devtools-mcp@1.8.0`；移动端固定为 `@mobilenext/mobile-mcp@1.0.14`。

| 检查 | 结果 | 实际范围 |
| --- | --- | --- |
| Claude Code 技能安装目录 | 通过 | 在独立临时项目中执行 `skills@1.7.4` 安装，生成 `.claude/skills/baodating/SKILL.md` |
| Codex 技能安装目录 | 通过 | 同样验证 `.agents/skills/baodating/SKILL.md`；没有运行 Claude Code 或 Codex 的模型研究任务 |
| Pi 技能入口 | 文档核实 | 官方目录、`--skill` 与 `/skill:baodating`；不把目录兼容视为完整研究评测 |
| 无头研究浏览器 | 通过 | 通过标准 stdio MCP 启动，观察到 headless 与专用 profile 参数、管道调试连接 |
| 元素读取与操作 | 通过 | 本地 HTTP 测试页：读取元素、按引用填入查询、刷新引用、点击按钮并核实结果 |
| 会话持久化 | 通过 | 干净退出 MCP 后，重启同一 profile，测试用 HttpOnly Cookie 仍由本地服务收到 |
| 配置隔离 | 通过 | 另一份新建 profile 访问同一测试服务时没有该 Cookie；没有读取或导入日常浏览器状态 |
| 桌面前台与物理鼠标 | 通过 | 启动和元素操作、同 profile 重启两轮中，前后观测的前台应用与鼠标位置均一致 |
| Mobile MCP 协议 | 通过 | 实际完成 initialize 与 tools/list，发现 33 个工具；核对元素、ref 点击及输入 schema |
| 移动设备枚举 | 无可用目标 | `mobile_list_available_devices` 成功返回空设备列表；本次没有可操作的本地真机、模拟器或仿真器 |
| Android ADB doctor | 超时 | `adb version` 成功，`adb devices -l` 在 1500ms 预算内未完成；此项不能单独证明无设备 |
| Android App 完整流程 | 未执行 | 需专用且已授权的设备，验证搜索、正文、评论与 ref 操作 |

浏览器 smoke 使用本地可控页面与合成 Cookie，不涉及商业平台账号。操作不依赖截图；最终快照为 **313 UTF-8 字节**、截图 **0 次**。未测 tokenizer 对应的 token 数；这个简单页面的数据不能推算真实 App 的节省比例。

持久化测试证明该测试状态在重启后保留，不证明任何商业平台已登录、登录永不过期，或评论、回复和视频可完整读取。前台和鼠标观测覆盖上述操作，不代表所有网站与系统状态。

首次 Mobile MCP 冷启动因下载依赖，在客户端 25 秒预算内未完成 initialize；完成固定版本依赖缓存后，重新启动并完成协议与设备枚举检查。没有把首次超时计为成功，也没有自动申请云设备或配置账号。

## 自动检查

本次在 macOS、Node.js 24.22.2 执行 **51 项离线测试，全部通过**。GitHub Actions 配置另覆盖 macOS/Linux、Node.js 22.20.0；远端运行结果以仓库 Checks 为准。

在仓库根目录运行，不需要安装项目依赖，也不会连接浏览器或设备：

```sh
node --check skills/baodating/scripts/browser.mjs
node --check skills/baodating/scripts/mobile.mjs
node --test tests/*.test.mjs
git diff --check
```

离线测试覆盖参数、路径与 profile 来源、权限、MCP 配置输出、ADB 状态解析、超时、退出码与进程收尾；它们不代表真实平台覆盖。

## 研究效果评测

技能中的 [10 个评测设计](../skills/baodating/evals/evals.json)仍是未执行的测试设计。它们用于后续检查探索检索、澄清负担、证据质量和比较结果，不是已经取得的性能数据。

真实研究任务应记录使用的渠道、动作、输入、日期、实际读取层次及失败原因。移动端另记录元素输出字节、所用 tokenizer（若实际测 token）、截图次数与失败恢复；参考[移动端验证流程](mobile.md)。
