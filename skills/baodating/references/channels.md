# Channels and capability boundaries

Read this when choosing tools, handling login, or explaining coverage. These are portable selection rules, not declarations that any named service or integration is installed.

## Discover before using

Inspect the host's tool catalog, connected services, tool documentation, or locally available CLI help. Do not assume tool namespaces, command flags, credentials, devices, or profiles from this document. Verify the specific action needed, then observe its actual result.

Prefer an existing connector, official API, or CLI when it supplies sufficient evidence. For example, configured `gh` can retrieve repository metadata, releases, and issues without browser automation. Repository search does not establish coverage of all code, discussions, or comments. Use the official website or GUI where necessary and usable. Do not build a scraper or adapter merely because one channel is blocked.

Choose a small route around the current gap:

| Task | Discovery route | Verification route and limits |
| --- | --- | --- |
| Software, plugins, skills, open source | Available search engine, ecosystem registry, related repositories | Official docs/pricing, license, releases, issues; independent usage reports for experience claims |
| Shopping | Category search and accessible stores | Exact SKU, seller, regional offer and service; reviews may refer to a different variant |
| Travel and food | Available maps, official venues, local discussion | Opening/booking status, dates, party size, transport, menu/package terms and recent feedback |
| Research | Relevant scholarly index, survey, citation trail | Original paper/version, methods, code and data; an index entry is not full-text access |
| Social/community evidence | Accessible search and original threads | Posts, comments, replies and media each need an action check; login or partial loading may hide layers |

Use another language, search engine, or source family when it addresses a real gap. Do not claim a particular engine was searched because another tool returned results from that domain. A platform's general support statement does not establish search, replies, visuals, price, or App access.

## Separate transport layers

The package currently supplies instructions only. The following are optional integration targets for a host to configure separately; no adapter, device, account, or success guarantee is provided here.

| Layer | Intended capability | What must be checked at runtime |
| --- | --- | --- |
| Native desktop app | App accessibility/UI reading and interaction; background actions when configured | Correct app, supported actions, OS permissions, background policy; no assumption that browser isolation applies to a native app |
| Isolated web session | Public web in an isolated ephemeral session; authenticated research in a dedicated profile; headless operation where supported | Actual session/profile binding, login, rendering and action support; headless web is separate from native desktop automation |
| Mobile device or emulator | Accessibility/element-tree reading first, screenshots for missing elements or visual evidence | Connected device, authorization, current UI, App/action coverage; desktop accessibility does not imply phone control |

Optional desktop dependency: [codex-computer-use](https://github.com/RUIIIOVO/codex-computer-use). This is an integration option, not a bundled runtime or portable namespace contract. The official OpenAI proprietary runtime is not bundled with BaoDaTing; availability and permissions depend on the host. Do not infer current installation from the link.

Use mobile when the needed App content, price, local information, or review layer cannot be obtained sufficiently on the web. Read a compact accessibility tree first when available, refresh references after state changes, and use screenshots when elements or visual evidence are missing. If screenshot-only access is all that exists, state that limitation. Do not promise token savings or platform acceptance without measurement.

## Sessions and authorization

- Use user-designated research-only accounts and dedicated sessions/profiles for authenticated research. Prefer an isolated session for public browsing where the host supports it. If isolation is unavailable, report it and use a suitable public route or obtain direction before authenticated research.
- Do not copy account cookies, tokens, daily-browser profiles, or another account's login state. Isolation is a session boundary, not a claim to defeat platform restrictions.
- Respect configured background-only operation. If the required action would focus an app or take the physical pointer, report the conflict and use another channel or request direction. Otherwise follow normal host interaction policy; background operation is not a universal user preference.
- Serialize actions within the same session, profile, app, or phone. Observe fresh UI state after navigation or interaction; do not reuse stale references or coordinates.
- At login, CAPTCHA, or blocking, record the boundary. Use an accessible alternative or let the user handle the step. Do not claim a bypass or silently create accounts/install integrations.
- Reading does not authorize purchase, booking, posting, reactions, messages, paid access, or changes to accounts. Keep credentials out of logs and outputs.

## Coverage record

For a complex task, record one entry per meaningful query/action in a user-authorized working location. A plain table is enough; JSON is optional. Record:

- Channel and actual tool; action such as search, read body, read comments, expand replies, view visuals, or read offer.
- Exact query/target, selected sort/time filters, and relevant region.
- Public/authenticated access state without account identifiers or secrets.
- Retrieval time and content dates when visible.
- Scope observed: loaded layers, pages, sample selection, counts only when measured.
- Status and the actual reason for a limitation.

Use distinct statuses:

| Status | Meaning |
| --- | --- |
| `unavailable` | Required tool, device, or access is not connected/available |
| `not_searched` | Channel/action was not attempted |
| `blocked` | Attempt failed due to access, login, rate limiting, or another observed barrier |
| `partial` | Only part of the requested content/layers was retrieved |
| `success_with_matches` | The recorded action succeeded and returned relevant results |
| `success_no_match` | The recorded search succeeded with no relevant matches in that scope |

“No matches” applies only to the query, filters and scope actually searched. A successful page load can still be partial for comments. A successful search does not prove every match was opened. Explain limitations without equating them with absence of candidates.
