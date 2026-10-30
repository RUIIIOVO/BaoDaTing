<div align="center">

# BaoDaTing · 包打听

有事先问包打听。

[中文](README.md) · [English](README.en.md)

[![Status: Skill draft](https://img.shields.io/badge/status-skill%20draft-64748b)](skills/baodating/SKILL.md)
[![License: MIT](https://img.shields.io/badge/license-MIT-64748b)](LICENSE)

</div>

一个帮 Agent 找资料、查证据、做比较的 Skill。你说一句需求，它先看看有哪些现成方案，再用少量选择题问清偏好，最后按功能和总成本给建议。

找软件、插件、开源项目，挑商品，做旅行与餐饮功课，或查论文，都可以从这里开始。

> “想找个工具把散落的网页和论文整理起来，先帮我看看有哪些选择。”

## 怎么用

在已安装的 [Pi](https://github.com/earendil-works/pi) 中加载：

```sh
git clone https://github.com/RUIIIOVO/BaoDaTing.git
cd BaoDaTing
pi --skill ./skills/baodating
```

然后直接说需求。其他兼容宿主可按自身方式加载 [SKILL.md](skills/baodating/SKILL.md)。宿主需要提供搜索或网页读取工具；加载 Skill 不会自动配置账号或连接设备。

## 怎么查

1. **先找现成的。** 查一轮真实选项，给出 2–4 个有来源的方向。
2. **再问清需求。** 每次只问一个影响选择的问题，从大方向问到细节，不要求先填表。
3. **追到原始资料。** 按任务查官网、文档、社区、评论或论文原文，核实功能、价格和适用条件。
4. **比较后给建议。** 看关键需求是否满足、贵出的部分是否值得，同时交代商业关联、证据冲突和没查到的内容。

主体、功能、价格是内部整理线索。科研任务还要看方法和证据强度，获取与复现费用不能替代学术质量。条件已明确时跳过追问；简单事实只做必要查询。没搜到不代表不存在。

## 当前进度

当前提供 **Skill 草稿和架构说明**，尚未完成端到端验证。检索和操作由宿主工具执行，渠道需另行接入。

| 渠道 | 接入方式 |
| --- | --- |
| 网页与代码 | 复用宿主的隔离无头浏览器；合适时用官方 API 或 `gh` |
| macOS 应用 | 可选接入 [codex-computer-use](https://github.com/RUIIIOVO/codex-computer-use)，需另装 OpenAI 官方运行时 |
| Android App | 计划使用专用真机与 Mobile MCP，先读元素，截图补充；尚未集成 |

登录研究使用独立浏览器配置与备用账号。原生桌面操作与无头浏览器分开；研究记录、偏好和凭据保存在仓库外。渠道覆盖、平台限制和 Token 用量需按实际环境验证。

[查看架构与能力边界 →](docs/architecture.md)

## 费用与许可

[MIT](LICENSE) 开源。模型、第三方 API、订阅和设备费用由所用服务决定。
