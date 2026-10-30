# 独立研究浏览器

`skills/baodating/scripts/browser.mjs` 是标准 **stdio MCP launcher**，供 Claude Code、Codex、Pi 等支持 stdio MCP 的客户端使用。它只启动官方 npm 包 `chrome-devtools-mcp@1.8.0`，不打包上游代码，也不修改全局 Pi、Chrome 或客户端配置。

## 启用

需要 macOS 或 Linux、系统安装的 Chrome stable、`npx`，以及上游支持的 Node：`^20.19.0 || ^22.12.0 || >=23`。建议使用 Node 22.12+ 的 LTS 版本。首次运行 npx 可能需要联网获取固定版本的官方包；已安装或缓存该版本时复用 npm 的正常解析机制，不要求本仓库有 `package.json`。

先用绝对路径生成配置；这一步只读取和检查路径，不启动子进程，不创建目录、锁或浏览器状态：

```sh
node /absolute/path/to/BaoDaTing/skills/baodating/scripts/browser.mjs --print-config
```

输出是一个 JSON 对象：

```json
{
  "command": "/absolute/path/to/node",
  "args": ["/absolute/path/to/BaoDaTing/skills/baodating/scripts/browser.mjs"],
  "env": {"BAODATING_DATA_DIR": "/absolute/private/data/baodating"},
  "profilePath": "/absolute/private/data/baodating/browser/research-profile",
  "profileNote": "Dedicated persistent research profile; created only when MCP runs. Never imports daily browser state."
}
```

将其中 **`command`、`args`、`env`** 三项加入客户端的 stdio MCP server 配置，server 名可用 `baodating-browser`。`profilePath` 和 `profileNote` 是说明，勿作为 MCP server 字段复制。客户端的 MCP 配置文件位置、TOML/JSON 包装格式及启用方式以其官方说明为准。不要把此 launcher 配成 HTTP、SSE 或连接现有 Chrome 的服务。

不带参数是唯一运行入口：

```sh
node /absolute/path/to/BaoDaTing/skills/baodating/scripts/browser.mjs
```

另有 `--help`。未知参数、多个参数、连接参数及上游参数透传全部拒绝，包括 `--autoConnect`、`--browserUrl`、`--wsEndpoint`、`--chromeArg`、`--userDataDir`、`--headless=false` 和 `--isolated`。

## 私有状态与隔离

默认数据根为 `${XDG_DATA_HOME:-~/.local/share}/baodating`，始终追加 `browser/research-profile`。可在客户端环境中显式设置绝对路径 `BAODATING_DATA_DIR` 来覆盖**数据根**，例如 `/absolute/private/research/baodating`；不能用它直接指定任意已有 Chrome profile。`--print-config` 会固定解析后的根，避免客户端启动环境变化导致换用另一份状态。

launcher 拒绝相对路径、`.`/`..` 路径分量、仓库内存储、系统目录、日常 Chrome 等常见配置位置、其他用户拥有或可被其他用户写入的私有目录。合法祖先别名（如 macOS `/tmp` → `/private/tmp`）先规范化，再检查其真实位置；专用数据根、内部目录及已有 profile 内容拒绝软链接、硬链接文件和特殊文件。路径检查依赖本机文件系统，不承诺抵御同一用户或管理员在检查与使用之间恶意替换目录。

首次运行创建空的专用 profile 和用途标记；拒绝接管无标记的非空 profile。创建的私有目录为 `0700`，标记与锁为 `0600`，子进程继承 `077` umask；重用 profile 时检查现有文件并收紧普通文件/目录权限。浏览器自身的运行时行为仍由上游和 Chrome 决定，不应把这视作操作系统沙箱或网络身份隔离。

固定上游命令为：

```text
npx --yes chrome-devtools-mcp@1.8.0 --headless=true --userDataDir=<dedicated-profile> --no-autoConnect --no-usage-statistics --no-performance-crux
```

已核实 1.8.0 CLI 支持这些选项。它以管道启动浏览器，不传 `browserUrl`、`wsEndpoint` 或可连接日常浏览器的覆写。子进程仅继承运行所需的路径、临时目录、语言、代理和证书环境；不透传 `NODE_OPTIONS`、Puppeteer、Chrome 配置、`CHROME_DEVTOOLS_MCP_SESSION_ID` 等注入项。固定设置 `CHROME_DEVTOOLS_MCP_NO_UPDATE_CHECKS=1` 和 `CHROME_DEVTOOLS_MCP_NO_USAGE_STATISTICS=1`。这关闭 MCP 更新检查、用量统计及 CrUX 集成，不代表 Chrome 或目标网站不产生网络请求。

## 备用账号与人工登录

首次 MCP 会话使用空的研究配置。需要登录的平台应使用独立备用账号，由用户在平台正常注册流程中自行建立；不要复制日常浏览器 Cookie、密码库、账号配置或整份 profile，也不要让工具接入日常 Chrome。

自动浏览始终无头运行，不操作桌面鼠标或抢占前台。人工验证码、扫码或交互登录需要用户自行在**研究环境**完成；本 launcher 不提供有头登录模式，也不会自动切到日常浏览器。如果当前研究环境没有可用的人工登录方式，应记录该渠道未接入或访问受限，改用其他来源。本工具不自动执行账号注册，也不声称已经完成任何真实平台登录。

## 重启、退出与证据边界

同一个数据根只允许一个 launcher。客户端断开 stdio 输入后，由上游 1.8.0 的 EOF 处理关闭 Chrome；launcher 继承标准输入输出，不占用 stdout 写日志。客户端发送 `SIGINT`、`SIGTERM`、`SIGHUP` 时，launcher 转发到独立子进程组，给出 7 秒退出时间，超时或重复信号强制结束该组；npx 退出后也清理组内遗留子进程。普通退出码保留；信号退出返回 `128 + signal`；找不到 npx 返回 `127`。

干净退出后，研究 profile 保留供下次重启使用，锁被移除。被 `SIGKILL`、断电等中断后可能留下 `browser/launcher.lock`；应先确认原 launcher 与研究 Chrome 均已停止，再人工移除该锁。不要删除仍在使用中的 Chrome 锁，也不要并发复用 profile。存在异常软链接或无效标记时会拒绝继续；可保留旧状态供人工检查，再选择一个全新的数据根。

持久化表示使用同一份本地状态，不保证平台登录永不过期、账号不受风控，或正文、评论、回复和视频均可完整读取。测试中的普通 Cookie 或本地页面持久化不构成真实平台登录证据。每次研究仍须记录来源、获取日期、实际覆盖范围及访问限制；私有账号、日志、截图和调查记录应保存在仓库外。

离线检查（不会启动 Chrome 或 npx）：

```sh
node --test tests/browser.test.mjs
```

测试覆盖路径与参数拒绝、配置输出无副作用、profile 来源及权限、子进程命令与环境，以及退出码、EOF 和信号生命周期。真实浏览器启动、页面操作、重启状态和桌面焦点须另做 smoke，不能从离线测试推断。
