# 扩展插件与资料渠道

[返回 README](../README.md) · [架构](architecture.md) · [安装](installation.md) · [验证记录](validation.md)

BaoDaTing 通过 Agent 客户端使用工具。增加插件或资料渠道时，先接入现有工具、MCP 服务或 CLI，再写清楚技能如何使用它。接入配置使用客户端原有机制；渠道说明沿用技能的 Markdown 参考文件。

## 接入一个新渠道

1. **确定需要补充的资料。** 说明现有来源缺少什么，例如论文全文、代码仓库 issue、商品规格或 App 评论。
2. **选择现有工具。** 优先官方连接器、API 或已有 CLI；需要页面交互再用浏览器，需要 App 内容再用设备。按工具官方文档在客户端配置。
3. **确认具体动作。** 检查搜索、读取正文、分页、评论、回复与截图分别能否使用；记录登录、地区、版本和费用条件。
4. **补充渠道说明。** 通用选择规则写入 [`references/channels.md`](../skills/baodating/references/channels.md)；较长的渠道说明放在同目录的独立文件，并从 `SKILL.md` 直接引用，供 Agent 按需读取。
5. **用真实任务检查。** 保留所用命令或工具、实际读取范围、来源与访问结果。环境结果写入验证记录，说明可以使用与尚未验证的动作。

能力由客户端提供的工具决定。渠道文档写明查找方式，执行时仍需发现真实工具名称、参数与权限。

## 一份渠道说明需要什么

以下是填写说明的结构，不是程序接口或必须注册的配置格式：

```markdown
# 渠道名称

## 何时使用
这个来源可以补充哪类决策证据；哪些任务适合其他来源。

## 接入条件
官方工具链接、安装方式、必要版本、账号或设备要求、可能费用。

## 读取方法
如何搜索与定位原文；正文、评论、回复、媒体分别如何读取。
先查看客户端实际工具说明或 CLI 帮助，确认参数。

## 证据与边界
保留来源定位、日期、版本和条件，记录实际读取范围。
区分成功无匹配、访问受阻、部分读取和渠道不可用。
遇到登录或限制时，使用替代来源或交由用户处理。
```

账号、Cookie、令牌、设备 ID 与个人路径放在仓库外的客户端配置中。公开说明使用通用占位路径，避免附上真实研究数据。

## 示例：使用 GitHub CLI 查询开源项目

适合检查仓库、许可、发布版本与问题反馈。前提是客户端可执行 `gh` 且已有所需访问权限。按 [GitHub CLI 官方文档](https://cli.github.com/manual/)检查命令，再执行只读查询，例如：

```sh
gh repo view RUIIIOVO/BaoDaTing --json nameWithOwner,description,url,licenseInfo
gh issue list --repo RUIIIOVO/BaoDaTing --state open --limit 20
```

这些是查询示例，不附带预设结果。`--limit 20` 限定了样本，列表也不代表评论与讨论已读完；需要原文时继续查询对应内容。创建 issue、发表评论或修改仓库需要相应用户授权。

## 浏览器、桌面与移动端

| 要扩展的渠道 | 复用入口 | 说明重点 |
| --- | --- | --- |
| 交互网页、登录资料 | [研究浏览器](browser.md)或客户端已有隔离浏览器 | 独立配置、账号状态、分页与评论层、截图补缺 |
| macOS 应用 | [codex-computer-use](https://github.com/RUIIIOVO/codex-computer-use) | 官方运行时、系统权限、应用与后台操作支持 |
| Android App | [Mobile MCP](mobile.md) | ADB、设备授权、明确设备 ID、元素优先与截图覆盖 |

同一会话、应用或设备的操作顺序执行。出现访问阻断就记录实际原因；平台允许读取的范围以实测为准。工具可执行交易或发送，并不表示研究请求已授权这些动作。

## 调整研究方法

| 想调整什么 | 改动位置 |
| --- | --- |
| 探索、澄清与交付流程 | [`SKILL.md`](../skills/baodating/SKILL.md) |
| 来源质量、商业关联与冲突判断 | [`references/evidence-and-quality.md`](../skills/baodating/references/evidence-and-quality.md) |
| 功能、成本及领域比较规则 | [`references/decision.md`](../skills/baodating/references/decision.md) |
| 个人偏好 | 在仓库外填写 [`preferences-template.md`](../skills/baodating/references/preferences-template.md)，由用户授权使用 |

保持 `SKILL.md` 简短，长材料按需引用，脚本路径相对技能目录解析。通用内容遵循 [Agent Skills 标准](https://agentskills.io/specification)；客户端特有功能需标明适用范围。

提交扩展时包含接入说明、必要的参考链接，以及实际验证过的动作和限制。可在 [`evals/evals.json`](../skills/baodating/evals/evals.json)补充代表性任务；用例设计与执行结果分别记录。
