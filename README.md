<div align="center">

# BaoDaTing · 包打听

先看看有哪些，再一起选。

[中文](README.md) · [English](README.en.md)

[![Status: Skill draft](https://img.shields.io/badge/status-skill%20draft-64748b)](skills/baodating/SKILL.md)
[![License: MIT](https://img.shields.io/badge/license-MIT-64748b)](LICENSE)

</div>

包打听是一个通用检索增强 Agent Skill：帮助现有智能体从一句模糊需求出发，查找实际可用的方案，逐步澄清需求，再根据证据、功能和总成本给出少量建议。

可以用来找软件、插件、开源项目，也可以比较商品、旅行与餐饮选择，或开展学术调研。

> “想找个工具，把散落的网页和论文整理起来，先帮我看看有哪些选择。”

## 怎么工作

1. **先查一轮。** 了解实际存在的选项，再给出 2–4 个有来源的方向。
2. **逐步缩小范围。** 从大方向到细节，每轮只问一个最影响选择的问题；不要求先填表。
3. **按任务选渠道。** 结合官网、文档、社区、论文原文等来源，必要时读取评论或补充其他渠道。
4. **核实关键证据。** 区分官方声明、用户反馈和已确认事实，检查商业关联、内容质量与来源独立性。
5. **给出少量建议。** 比较关键功能、价格、配置与维护成本，解释更贵的选项多带来了什么。

主体、功能、价格是内部分析线索，不是固定问卷。学术调研会关注方法、证据强度和获取、复现成本；简单的事实问题只做必要步骤。没搜到不代表不存在，也不应在调查现有方案前先建议开发。

## 加载草稿

需要一个能加载 Skill、并已提供搜索或网页读取工具的宿主智能体。本仓库不附带模型服务和渠道工具。

以已安装的 [Pi](https://github.com/badlogic/pi-mono) 为例：

```sh
git clone https://github.com/RUIIIOVO/BaoDaTing.git
cd BaoDaTing
pi --skill ./skills/baodating
```

然后直接用一句话描述需求。其他兼容宿主可按自身的 Skill 加载方式使用 [skills/baodating/SKILL.md](skills/baodating/SKILL.md)。加载 Skill 不会自动安装浏览器、配置账号或连接手机。

## 当前状态

公开版本包含 **Skill 草稿与架构说明**。它规定研究流程，实际搜索和操作由宿主已连接的工具完成；目前不是通用爬虫、GUI 执行器或训练好的广告检测器，也未完成端到端验证。

- 公开网页优先复用宿主已有的隔离无头浏览器；可用时使用官方 API 或 `gh`。
- 登录研究使用独立的持久化浏览器配置与备用账号，需单独接入，不连接日常浏览器。
- macOS 原生应用操作可选接入 [codex-computer-use](https://github.com/RUIIIOVO/codex-computer-use)，另需 OpenAI 官方运行时；它与无头网页浏览器是不同工具。
- Android 计划优先使用专用真机与 Mobile MCP，先读紧凑无障碍元素，截图补充缺失信息；尚未集成。

渠道是否可用、能读到哪些内容，都取决于实际环境。项目不保证规避平台风控或固定比例的 Token 节省。

详见[架构与能力边界](docs/architecture.md)。研究证据、个人偏好、账号状态与凭据应保存在 Git 仓库之外。

## 费用与许可

本项目按 [MIT](LICENSE) 许可开放。模型调用、第三方 API、订阅和设备可能产生独立费用，取决于所用服务。
