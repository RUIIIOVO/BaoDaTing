<div align="center">

# BaoDaTing · 包打听

Ask BaoDaTing first.

[中文](README.md) · [English](README.en.md)

[![Status: Skill draft](https://img.shields.io/badge/status-skill%20draft-64748b)](skills/baodating/SKILL.md)
[![License: MIT](https://img.shields.io/badge/license-MIT-64748b)](LICENSE)

</div>

An agent skill for finding sources, checking evidence, and comparing options. Start with a sentence: the agent explores existing solutions, asks a few multiple-choice questions, then recommends options based on capabilities and total cost.

Use it to find software, plugins, and open-source projects; compare products; research travel and dining; or explore academic literature.

> “I need a way to organize scattered web pages and papers. Help me explore the options first.”

## Use it

Load the skill in an existing [Pi](https://github.com/earendil-works/pi) installation:

```sh
git clone https://github.com/RUIIIOVO/BaoDaTing.git
cd BaoDaTing
pi --skill ./skills/baodating
```

Then describe what you need. Other compatible hosts can load [SKILL.md](skills/baodating/SKILL.md) through their own skill mechanism. The host must provide search or web-reading tools; loading the skill does not configure accounts or connect devices.

## How it searches

1. **Find what exists.** Explore actual options and offer 2–4 directions with sources.
2. **Clarify what matters.** Ask one consequential question at a time, moving from broad goals to details. No intake form required.
3. **Follow original sources.** Choose official sites, documentation, communities, comments, or original papers for the task. Check capabilities, prices, and applicable conditions.
4. **Compare and recommend.** Check essential needs and whether upgrades justify their cost. Report commercial relationships, conflicting evidence, and gaps in coverage.

Subject, function, and price organize the agent's internal notes. Academic work also requires assessing methods and evidence strength; access and reproduction costs do not replace research quality. Skip questions when the requirements are clear and keep factual lookups short. An unsuccessful search does not prove something does not exist.

## Current progress

This repository provides a **skill draft and architecture notes**, without end-to-end validation yet. The host performs searches and actions; channels require separate setup.

| Channel | Integration |
| --- | --- |
| Web and code | Reuse the host's isolated headless browser; use official APIs or `gh` when appropriate |
| macOS apps | Optionally use [codex-computer-use](https://github.com/RUIIIOVO/codex-computer-use), with the official OpenAI runtime installed separately |
| Android apps | Planned: a dedicated real device with Mobile MCP, elements first and screenshots for gaps; not integrated yet |

Account-based research uses a separate browser profile and backup accounts. Native desktop control and the headless browser are separate tools. Keep research records, preferences, and credentials outside the repository. Measure channel coverage, platform restrictions, and token usage in the actual environment.

[Architecture and capability boundaries →](docs/architecture.md)

## Cost and license

Open source under [MIT](LICENSE). Model calls, third-party APIs, subscriptions, and devices may incur separate costs depending on the services used.
