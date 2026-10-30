<div align="center">

# BaoDaTing · 包打听

**有事先问包打听。**

从一句需求出发，找资料、查证据、做比较。

[English](README.en.md) · [安装](docs/installation.md) · [架构](docs/architecture.md) · [扩展](docs/extensions.md)

</div>

BaoDaTing 是一个遵循 [Agent Skills 标准](https://agentskills.io/specification)的研究技能，让 Claude Code、Codex、Pi 等 Agent 帮你发现现成方案、核实关键说法，并按实际需求和总成本给出建议。

找软件、插件与开源项目，挑商品，做旅行与餐饮功课，或查论文，都可以从这里开始。

> 想找个工具把散落的网页和论文整理起来，先帮我看看有哪些选择。

## 开始使用

在要使用技能的项目目录运行，按客户端任选一条。需要 **Node.js 22.20+** 和已安装的 Agent 客户端。

```sh
# Claude Code
npx skills add RUIIIOVO/BaoDaTing --skill baodating -a claude-code

# Codex
npx skills add RUIIIOVO/BaoDaTing --skill baodating -a codex

# Pi
npx skills add RUIIIOVO/BaoDaTing --skill baodating -a pi
```

安装默认作用于当前项目；加 `-g` 可供个人所有项目使用。这里的 `skills` 是 [Vercel 的安装工具](https://github.com/vercel-labs/skills)，从 GitHub 获取本技能。

启动客户端后直接描述需求，也可以显式调用：

| Claude Code | Codex | Pi |
| --- | --- | --- |
| `/baodating 帮我选一个文献管理工具` | `$baodating 帮我选一个文献管理工具` | `/skill:baodating 帮我选一个文献管理工具` |

Agent 需要具备搜索或来源读取工具。安装技能不会自动安装 MCP 服务、连接设备或登录账号。手动安装、Pi 临时加载及可选渠道见[安装指南](docs/installation.md)。

## 它怎么帮你做选择

1. **先看有哪些方案。** 做一轮真实检索，找到有来源的候选与方向。
2. **再问影响选择的问题。** 从大方向到细节，每轮只问一个关键问题；条件明确就直接查。
3. **回到原始资料核实。** 查功能、价格、限制和实际反馈，说明商业关联、证据冲突与未知项。
4. **比较值得付出的成本。** 先看必要条件，再看费用、配置、维护和迁移；解释多花钱能换来什么。

建议带上来源、适用条件与检索缺口，也可以是先试用、继续用现有工具或暂不购买。科研任务优先比较方法与证据强度，费用只用于判断获取与复现的可行性。

```mermaid
flowchart LR
    A[一句需求] --> B[技能策略：探索与澄清]
    B --> C[客户端可用渠道：搜索 / API / 浏览器 / 设备]
    C -->|只读检索| D[来源与证据]
    D --> E[比较与建议]
    E -. 用户另行授权 .-> F[交易 / 预订 / 发送]
```

## 渠道与扩展

研究方法随技能携带，搜索与操作交给客户端已经接入的工具。按任务选择渠道，缺少某个渠道时说明覆盖范围。

| 需要的资料 | 可选渠道 |
| --- | --- |
| 网页、文档与代码 | 搜索、官方 API、`gh`、独立研究浏览器 |
| macOS 应用内容 | [codex-computer-use](https://github.com/RUIIIOVO/codex-computer-use)，另需 OpenAI 官方运行时与系统权限 |
| Android App 内容 | Mobile MCP、专用设备与 ADB；先读元素，截图补充 |

仓库提供可选的浏览器与移动端启动脚本，配置方式见[安装指南](docs/installation.md#可选渠道)。研究浏览器使用独立持久化配置，账号状态、凭据、偏好和研究记录保存在仓库外。

**加一个插件或数据源：** 先把现有工具、MCP 或 CLI 接入客户端，再补充渠道说明：何时用、如何查、能读到什么、有什么限制。具体做法见[扩展指南](docs/extensions.md)。

## 继续了解

- [架构](docs/architecture.md)：策略、执行、证据的职责与数据流。
- [安装](docs/installation.md)：三种客户端、标准目录与可选 MCP 配置。
- [扩展](docs/extensions.md)：复用现有工具，为新渠道补充说明。
- [验证记录](docs/validation.md)：具体环境、已执行检查与待验证能力。

## 费用与许可

[MIT](LICENSE) 开源，BaoDaTing 本身不收取使用费。模型调用、第三方 API、订阅与设备可能产生费用，以所用服务为准。
