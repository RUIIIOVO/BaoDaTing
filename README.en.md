<div align="center">

# BaoDaTing · 包打听

Explore the options. Then choose together.

[中文](README.md) · [English](README.en.md)

[![Status: Skill draft](https://img.shields.io/badge/status-skill%20draft-64748b)](skills/baodating/SKILL.md)
[![License: MIT](https://img.shields.io/badge/license-MIT-64748b)](LICENSE)

</div>

BaoDaTing is a general retrieval-enhancement agent skill. It helps an existing agent turn a vague request into actual options, clarify what matters, and make a few recommendations based on evidence, capabilities, and total cost.

Use it to find software, plugins, and open-source projects; compare products, travel, and dining options; or conduct academic research.

> “I need a way to organize scattered web pages and papers. Help me explore the options first.”

## How it works

1. **Explore first.** Search for actual options, then offer 2–4 meaningful directions with sources.
2. **Narrow the choice.** Move from broad goals to details, asking one key question at a time. No intake form required.
3. **Choose sources for the task.** Use official sites, documentation, communities, and original papers; read comments or add other channels when needed.
4. **Check the evidence.** Distinguish official claims, user reports, and confirmed facts. Examine commercial relationships, content quality, and source independence.
5. **Recommend a few options.** Compare essential capabilities, price, setup, and maintenance costs. Explain what a higher price actually adds.

Subject, function, and price guide the agent's internal analysis rather than a fixed questionnaire. Academic work emphasizes methods, evidence strength, access, and reproduction costs. Simple factual questions use only the necessary steps. An unsuccessful search does not establish that something does not exist; investigate existing options before suggesting a new build.

## Load the draft

You need a host agent that can load skills and already provides search or web-reading tools. This repository does not bundle model access or channel tools.

For example, with [Pi](https://github.com/badlogic/pi-mono) already installed:

```sh
git clone https://github.com/RUIIIOVO/BaoDaTing.git
cd BaoDaTing
pi --skill ./skills/baodating
```

Then describe your request in a sentence. For other compatible hosts, load [skills/baodating/SKILL.md](skills/baodating/SKILL.md) using the host's own mechanism. Loading the skill does not install browsers, configure accounts, or connect a phone.

## Current status

This release contains a **skill draft and architecture notes**. It defines a research workflow; the host's connected tools perform searches and actions. It is not a universal crawler, GUI runner, or trained ad detector, and has not completed end-to-end validation.

- Public pages reuse an existing isolated headless browser supplied by the host. Use official APIs or `gh` where available and appropriate.
- Account-based research uses a separate persistent browser profile and backup accounts. This requires separate setup and does not connect to the everyday browser.
- Native macOS app access can optionally use [codex-computer-use](https://github.com/RUIIIOVO/codex-computer-use). It requires the official OpenAI runtime separately and is a different tool from the headless web browser.
- Android access is planned around a dedicated real device and Mobile MCP: compact accessibility elements first, screenshots for gaps. It is not integrated yet.

Channel availability and readable content depend on the actual environment. The project promises neither protection from platform restrictions nor a fixed reduction in token usage.

See [architecture and capability boundaries](docs/architecture.md). Keep research evidence, personal preferences, account state, and credentials outside Git.

## Cost and license

The project is available under the [MIT license](LICENSE). Model calls, third-party APIs, subscriptions, and devices may incur separate costs depending on the services you use.
