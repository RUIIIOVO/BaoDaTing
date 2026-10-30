# 安装与渠道配置

[返回 README](../README.md) · [架构](architecture.md) · [扩展](extensions.md) · [验证记录](validation.md)

先安装技能，让 Agent 使用已有搜索或来源读取工具；需要浏览器或 App 资料时，再接入相应渠道。技能、MCP 配置、设备准备与账号登录各自独立。

## 通过 skills CLI 安装

准备已安装的 Claude Code、Codex 或 Pi，以及 **Node.js 22.20+**（建议使用满足要求的 LTS 版本）。该版本要求来自 [skills CLI](https://github.com/vercel-labs/skills)，手动复制技能本身不需要 Node。

在要使用技能的项目目录运行，按客户端任选一条：

```sh
npx skills add RUIIIOVO/BaoDaTing --skill baodating -a claude-code
npx skills add RUIIIOVO/BaoDaTing --skill baodating -a codex
npx skills add RUIIIOVO/BaoDaTing --skill baodating -a pi
```

默认安装到当前项目；加 `-g` 安装到个人目录。`--copy` 选择复制而非符号链接。`skills` 是 Vercel 发布的安装工具，命令从 GitHub 仓库读取 BaoDaTing；不依赖 BaoDaTing 的 npm 包。

检查可发现的技能或安装结果：

```sh
npx skills add RUIIIOVO/BaoDaTing --list
npx skills list
```

个人安装的列表使用 `npx skills list -g`。CLI 的目录选择与选项见[官方安装参考](https://github.com/vercel-labs/skills/blob/main/docs/commands.md#skills-add)。

## 手动放入标准目录

下载或克隆仓库，将完整的 `skills/baodating/` 目录复制或链接到以下位置，保留 `SKILL.md`、`references/` 与可选 `scripts/` 的相对关系。

| 客户端 | 当前项目 | 个人所有项目 |
| --- | --- | --- |
| Claude Code | `.claude/skills/baodating/` | `~/.claude/skills/baodating/` |
| Codex | `.agents/skills/baodating/` | `~/.agents/skills/baodating/` |
| Pi | `.agents/skills/baodating/` 或 `.pi/skills/baodating/` | `~/.agents/skills/baodating/` 或 `~/.pi/agent/skills/baodating/` |

例如，给 Codex 或 Pi 安装个人技能（目标位置尚无同名目录时）：

```sh
git clone https://github.com/RUIIIOVO/BaoDaTing.git
mkdir -p ~/.agents/skills
cp -R BaoDaTing/skills/baodating ~/.agents/skills/baodating
```

Claude Code 改用 `~/.claude/skills`。复制后需要自行同步更新；符号链接依赖原仓库路径保持可用。

## 调用与确认加载

以下内容输入客户端对话框，不是 shell 命令：

| 客户端 | 显式调用 | 没有出现时 |
| --- | --- | --- |
| Claude Code | `/baodating 帮我选一个文献管理工具` | 检查技能目录与 `/skills` 列表；重启会话 |
| Codex | `$baodating 帮我选一个文献管理工具` | 通过 `/skills` 或输入 `$` 查看；必要时重启 |
| Pi | `/skill:baodating 帮我选一个文献管理工具` | 检查启动诊断；执行 `/reload` |

也可以直接描述研究需求，由客户端按技能描述选择加载。能找到技能说明只代表技能已被发现；是否能联网、读评论或访问 App，要分别检查工具与实际结果。

Pi 还支持临时加载，无需写入安装配置：

```sh
git clone https://github.com/RUIIIOVO/BaoDaTing.git
cd BaoDaTing
pi --skill ./skills/baodating
```

## 可选渠道

客户端已有可用工具时可以直接复用。下列脚本只提供可选的 stdio MCP 启动入口。首次启动可能通过 `npx` 下载上游包；安装技能不会自动注册或启动这些 MCP 服务。

文档中的 `/absolute/path/to/BaoDaTing` 表示你的仓库绝对路径；复制安装后也可改为已安装技能的实际路径。`/absolute/path/to/baodating-data` 表示仓库外的私有数据目录，需替换后使用。

### 研究浏览器

需要 Node.js、`npx` 与系统 Chrome stable。`chrome-devtools-mcp@1.8.0` 的 Node 要求为 `^20.19.0 || ^22.12.0 || >=23`；上文推荐的 Node 22.20+ 满足要求。启动脚本支持 macOS 与 Linux。

先查看命令配置，此操作不创建配置目录或启动浏览器：

```sh
node /absolute/path/to/BaoDaTing/skills/baodating/scripts/browser.mjs --print-config
```

输出包含 `command`、`args`、`env`，以及用于核对独立配置位置的 `profilePath`、`profileNote`。将前三项填写到客户端的 stdio MCP 配置中；后两项是说明字段，不作为 MCP 命令参数。

通用命令配置示意，需按客户端格式嵌入：

```json
{
  "command": "node",
  "args": ["/absolute/path/to/BaoDaTing/skills/baodating/scripts/browser.mjs"],
  "env": {"BAODATING_DATA_DIR": "/absolute/path/to/baodating-data"}
}
```

优先采用 `--print-config` 输出的 Node 可执行文件绝对路径，避免客户端的 `PATH` 不包含 `node`。`BAODATING_DATA_DIR` 可省略，默认数据根目录为 `${XDG_DATA_HOME:-~/.local/share}/baodating`，固定在其下使用 `browser/research-profile`。

正常启动不带参数，运行固定版本 `chrome-devtools-mcp@1.8.0`，使用独立持久化配置与无头 Chrome，关闭自动连接和使用统计。脚本只另接受 `--help` 或 `--print-config`，不接受连接日常 Chrome 的参数。同一研究配置只能由一个浏览器进程使用。

详细要求、登录与排障见[研究浏览器说明](browser.md)。

### Android 与 Mobile MCP

启动脚本需要 **Node.js 20+** 和 `npx`，使用固定版本 `@mobilenext/mobile-mcp@1.0.14`。Android 读取还需要 ADB、用户授权的专用设备或模拟器，以及可访问的目标 App。

```sh
node /absolute/path/to/BaoDaTing/skills/baodating/scripts/mobile.mjs --print-config
node /absolute/path/to/BaoDaTing/skills/baodating/scripts/mobile.mjs --doctor --json
```

`--print-config` 输出上游 MCP 的 `command` 和 `args`，不联网、不探测设备。正常运行脚本不带参数，通过 stdio 启动固定版本并禁用上游 telemetry；需要该启动行为时，客户端命令使用 `node`，参数使用 `mobile.mjs` 的绝对路径。

`--doctor` 仅检查 Android ADB 状态，默认每次探测超时 1500ms；可用 `--timeout-ms 100..5000` 调整。多设备时需明确 `--device ID`；此选项只选择诊断目标，不限制 MCP 服务可访问的设备。实际 MCP 调用仍须明确设备 ID。

完整命令、返回状态和设备准备见[移动端说明](mobile.md)。

### macOS 应用

可选接入 [codex-computer-use](https://github.com/RUIIIOVO/codex-computer-use)，按其文档准备 OpenAI 官方运行时与 macOS 权限。原生应用操作与独立研究浏览器分别配置，支持范围由所用工具和应用决定。

## 客户端 MCP 配置入口

各客户端的配置文件格式不同。把启动命令放入自己的配置，重启或重载后检查服务与工具列表。技能目录中的脚本不会替你修改客户端配置。

- [Claude Code MCP 官方文档](https://code.claude.com/docs/en/mcp)：stdio 服务的添加与作用域。
- [Codex MCP 官方文档](https://developers.openai.com/codex/mcp/)：CLI 与配置文件中的服务入口。
- [Pi MCP 官方文档](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/mcp.md)：`mcp.json` 与服务管理。

账号状态、凭据、设备信息、研究浏览器配置与研究记录都放在仓库外。具体环境的检查结果集中记录在[验证记录](validation.md)，不以安装成功推断平台内容已可完整读取。

## 技能安装方式的官方依据

- [Agent Skills specification](https://agentskills.io/specification)：标准目录、元数据与按需读取参考材料。
- [Claude Code skills](https://code.claude.com/docs/en/skills)：`.claude/skills/`、个人目录与 `/skill-name` 调用。
- [Codex skills](https://developers.openai.com/codex/skills/)：`.agents/skills/`、个人目录、符号链接与显式调用。
- [Pi skills](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/skills.md)：标准目录、`--skill` 与 `/skill:name`。
- [skills 支持的客户端](https://github.com/vercel-labs/skills/blob/main/docs/agents.md)及[包元数据](https://github.com/vercel-labs/skills/blob/main/package.json)：客户端名称、安装路径与 Node 要求。
