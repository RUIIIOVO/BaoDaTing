# Mobile MCP

通过标准 stdio MCP，将 [Mobile Next Mobile MCP](https://github.com/mobile-next/mobile-mcp) 接入 Claude Code、Codex、Pi 等客户端。[mobile.mjs](../skills/baodating/scripts/mobile.mjs) 负责启动与 Android 检查；设备操作由上游实现。首选专用 Android 真机，已有模拟器可选；脚本不安装或启动模拟器。

## 版本与命令

默认 MCP 启动需要 **Node.js >=22.12.0**、npm/npx；建议使用 Node 22.20+ 或更新 LTS。launcher 自身的离线 `--print-config` / `--doctor` 使用 Node 20+ 内置模块。默认 launcher 支持 macOS/Linux；Windows 使用下文的通用上游配置，其进程树清理未在本项目验证。

固定实际发布版 **`@mobilenext/mobile-mcp@1.0.14`**，默认执行：

```bash
npx --yes @mobilenext/mobile-mcp@1.0.14
```

已核实 [npm 元数据](https://www.npmjs.com/package/@mobilenext/mobile-mcp/v/1.0.14)及[发布包](https://registry.npmjs.org/@mobilenext/mobile-mcp/-/mobile-mcp-1.0.14.tgz)：顶层包声明 Node `>=20`，但其固定依赖 `mobilewright@0.0.67` 声明 `>=22.12.0`，实际启动要求取后者。bin 为 `lib/index.js`，`gitHead` 为 `6c945971b6b16832f7fa2a69ae23d33e8b9beb71`。工具示例依据该包的 `lib/server.js` 和 `lib/format-elements.js`，升级时须重新核对 schema。

固定顶层包不等于锁定整棵依赖树。首次默认启动可能通过 npx 下载包、依赖及平台文件；能否离线启动取决于缓存。上游通过 mobilecli 通信：该版的 mobilewright/driver-mobilecli 依赖会带入 mobilecli 及其平台可选包，不要求 `mobilecli` 全局命令存在。若出现“mobilecli unavailable”，先排查 npm 可选依赖；上游也支持用私有 `MOBILECLI_PATH` 指向已有可执行文件。此路径不放入公共示例。

从仓库根目录运行：

```bash
# 默认只启动 stdio MCP，不预先探测设备
node skills/baodating/scripts/mobile.mjs

# 只打印通用配置；不联网、不执行 adb/npx、不读设备或账号
node skills/baodating/scripts/mobile.mjs --print-config

# Android 有界检查，不启动 MCP
node skills/baodating/scripts/mobile.mjs --doctor
node skills/baodating/scripts/mobile.mjs --doctor --json --timeout-ms 1500
node skills/baodating/scripts/mobile.mjs --doctor --json --device DEVICE_ID
```

未知参数、位置参数、重复或冲突模式全部拒绝，退出码 2。`--json`、`--device`、`--timeout-ms` 只用于 `--doctor`；不支持任意上游参数或 HTTP 模式。

默认 stdout 直接用于上游 MCP，无 launcher 横幅；诊断写 stderr。launcher 继承上游退出码，在子进程环境禁用遥测；收到 SIGINT/SIGTERM/SIGHUP 后向自己创建的 npx 进程组转发信号，500ms 后清理，分别以 130/143/129 退出；正常退出也清理该组的残留进程。不执行 `adb kill-server`，不按全局进程名清理。

## MCP 配置

`--print-config` 的完整输出如下，无设备 ID、账号或个人路径；`env` 保持与 launcher 相同的上游遥测设置：

```json
{
  "command": "npx",
  "args": ["--yes", "@mobilenext/mobile-mcp@1.0.14"],
  "env": {"MOBILEMCP_DISABLE_TELEMETRY": "1"}
}
```

Claude Code 项目 `.mcp.json`、Pi 项目 `.pi/mcp.json` 使用同一个对象：

```json
{
  "mcpServers": {
    "baodating-mobile": {
      "command": "npx",
      "args": ["--yes", "@mobilenext/mobile-mcp@1.0.14"],
      "env": {"MOBILEMCP_DISABLE_TELEMETRY": "1"}
    }
  }
}
```

若要经过本仓库的进程清理 wrapper，将 `command` 改成 `node`，`args` 改成 `["/ABSOLUTE/TO/BaoDaTing/skills/baodating/scripts/mobile.mjs"]`。这是路径占位符，须手工替换。Pi 项目配置需要项目信任；支持原生 MCP 的 Pi 可用 `/mcp` 检查，外部改配置后 `/reload`。旧版本或替换内置 MCP 的扩展以其实际文档为准。

Codex 项目 `.codex/config.toml`：

```toml
[mcp_servers.baodating-mobile]
command = "npx"
args = ["--yes", "@mobilenext/mobile-mcp@1.0.14"]

[mcp_servers.baodating-mobile.env]
MOBILEMCP_DISABLE_TELEMETRY = "1"
```

同样可替换成上述 `node` wrapper。配置均供手工采用，脚本不修改全局客户端配置、不运行上游 `install` 子命令。

连接后依次检查 **initialize → tools/list → mobile_list_available_devices**：分别证明传输、工具发现、设备枚举，不能互相替代。实际设备调用可能阻塞，客户端应设置请求 deadline；doctor 的边界只覆盖自己的 adb 探测，不覆盖上游工具内部执行。

## Android 准备与 doctor

用户准备专用 Android 真机、数据线和适合研究的独立账号，按 [Android 官方说明](https://developer.android.com/tools/releases/platform-tools)准备 Platform Tools，并将 adb 放入 PATH。在设备上开启开发者选项与 USB 调试，解锁并处理 RSA 授权。不要复制日常账号会话或把设备 ID、凭据提交到仓库。

doctor 顺序执行 `adb version`、`adb devices -l`，不安装 APK、不点击、不登录；adb 自身可能启动其 server。单次探测默认 1500ms，`--timeout-ms` 只接受 100..5000 的整数；超时或输出超限后给自己启动的探测进程组 SIGTERM，200ms 后 SIGKILL 并结束。前一步失败不继续后一步；总耗时最多约两次探测预算及清理时间。每次 stdout+stderr 上限 64KiB，不回显原始 stderr、序列号、型号或路径。

JSON 示例是**虚构夹具结果，不是本机实测**：

```json
{"ok":false,"platform":"android","upstreamVersion":"1.0.14","timeoutMs":1500,"counts":{"total":2,"ready":1,"unauthorized":1,"offline":0,"other":0},"explicitDevice":false,"status":"multiple","action":"Pass --device ID; use the same explicit device in MCP calls."}
```

| status | 含义与处理 |
| --- | --- |
| `ready` | 目标 adb 状态为 `device`；只说明 adb 层就绪 |
| `adb-missing` / `adb-error` | adb 不存在 / 启动失败、非零退出或异常终止 |
| `absent` | 命令成功且有效列表为空；只有此状态支持“本次未发现设备” |
| `unauthorized` / `offline` | 用户处理设备授权 / 连接状态后重试 |
| `multiple` | 多台设备，须显式 `--device ID`，不能盲选第一台 |
| `device-not-found` / `unavailable` | 指定 ID 不在列表 / recovery、无权限等非就绪状态 |
| `timeout` | 探测未按时完成，**不能推断没有设备** |
| `invalid-output` / `output-limit` | 输出无法识别 / 超限，均不算成功 |
| `interrupted` | doctor 被 SIGINT/SIGTERM/SIGHUP 中断 |

仅 `ready` 为 `ok:true`、退出码 0，其余 doctor 状态退出码 1。有 `stage` 时为 `adb-version` 或 `adb-devices`；列表解析成功时附带数量，不含 ID。`--device` 只选择 doctor 检查条目，不构成上游设备绑定；**每次 MCP 设备调用仍须显式提供 `device`**。

超时后记录阶段并停止自动重试，让用户检查连接、授权或其他 adb 使用者；不反复长等待、不杀共享 server。实际环境的检查结果见[验证记录](validation.md)。

## 单 App search → detail → comments/ref smoke

这是接设备后执行的验证流程，**尚不代表 App journey 已实测**。使用用户已安装、允许研究的单个 App 和受控关键词，默认只搜索和阅读。launcher 不分析操作语义、不实施只读过滤；上游仍提供安装、输入、点击等能力。发送、交易、点赞、账号变更等由客户端 agent 按用户授权管控，MCP 注解不能替代权限执行。

先枚举并确认目标，再读紧凑无障碍元素：

```text
mobile_list_available_devices({})
mobile_list_elements_on_screen({"device":"DEVICE_ID","format":"text"})
```

上游真实 ref 形状是 `@e5`，不是自定义的 `elementId`。text 格式的**合成示例**：

```text
One element per line: @ref Type text= label= name= value= id= at=x,y size=WxH [focused] [selected] [checked] [disabled]
@e5 EditText text="搜索" at=24,80 size=600x80
```

`format:"json"` 返回的 tool 文本为 `Found these elements on screen: ` 加 JSON 数组，**不是裸 JSON**；对象有 `ref`、`type`、可选文本字段及 `coordinates:{x,y,width,height}`。读取实际 MCP `content` 并检查 `isError`，不要臆造返回字段。

1. **搜索**：用户先打开目标 App。读元素，找到搜索入口真实 ref，点击、刷新；找到输入框，点击、刷新并确认焦点后输入。`mobile_type_keys` 不接收 ref，只对当前焦点输入；确认 Enter 是搜索才用 `submit:true`。
2. **详情**：搜索后刷新元素，用结果当前 ref 打开一条详情，再刷新；记录标题、正文及实际可读取范围。
3. **评论**：用详情页当前 ref 打开评论并刷新，记录可见评论、回复及缺口。需要滚动时先核对 swipe schema，每次滚动后刷新；不把总评论数当成已读数。
4. **ref smoke**：至少记录一次“获取当前 ref → 用它导航 → 刷新并确认页面”。不故意试点旧 ref；点击、输入、导航、滚动、弹窗或键盘改变后都刷新。
5. **截图补缺**：仅在缺元素或需要广告标记、图表、图片、视频帧等视觉证据时截图，记录原因与频率。坐标回退按截图返回的缩放映射换算，操作后刷新。视频截图只证明观察了该帧。

下列片段须逐步检查结果；`DEVICE_ID`、关键词与 ref 都是占位值，不能直接批量照抄：

```text
mobile_click_on_screen_at_coordinates({"device":"DEVICE_ID","ref":"@e5"})
mobile_list_elements_on_screen({"device":"DEVICE_ID","format":"text"})
# 确认焦点是搜索框后：
mobile_type_keys({"device":"DEVICE_ID","text":"受控研究关键词","submit":true})
mobile_list_elements_on_screen({"device":"DEVICE_ID","format":"text"})
# 仅需要视觉证据时：
mobile_take_screenshot({"device":"DEVICE_ID","maxSize":1024})
```

客户端可能给工具名添加前缀，以实际 tools/list 为准。上游 legacy robot 对 ref 点击会报不支持，不能记成 ref 通过；核对模式和能力后记录限制，不悄悄回退成“已通过”。

## 测量与恢复记录模板

原始响应、截图、真实设备 ID 和账号状态存仓库外的私有目录；公共记录只放脱敏结果。

| 字段 | 每个场景待填写 |
| --- | --- |
| 环境与目标 | 日期、OS/Node/npm、launcher commit、mobile-mcp/mobilecli/客户端/模型版本；设备匿名别名、Android/App 版本、登录状态不含凭据 |
| 范围与状态 | 关键词、停止条件、允许动作；initialize/tools/list/list_devices 与 doctor 各自结果、耗时、stage/exit code |
| 工具调用 | 顺序、工具名、脱敏参数、耗时、成功/`isError`/异常/超时；动作是否可能已生效 |
| 输出字节 | 原始 MCP JSON UTF-8 字节、文本 content 字节、实际送入模型的文本字节，分别记录截断/压缩方法 |
| Token | 实际可用 tokenizer 名称/版本/配置、对应模型、计数范围和结果；无可用 tokenizer 就填“未测” |
| 截图频率 | 截图次数/工具调用总数、页面数、触发原因、分辨率、原始图像与 base64/JSON 字节；无图像计费数据则图像 token 填“未测” |
| 覆盖与 ref | 搜索/正文/评论/回复/视频各自已读范围及缺口；获取/使用 ref 的调用序号、动作后刷新与页面确认结果 |
| 失败恢复 | 失败原因、恢复动作、结果、剩余阻塞，不把失败改记成功 |

文本字节可用 `Buffer.byteLength(text,'utf8')`；二进制用文件大小。`JSON.stringify(result)` 的字节是重新序列化大小，不能称原始传输量。不用字符数除常数冒充 tokenizer 实测；图像字节、base64 长度、文本 token、图像 token 分开记，模型计费以客户端实际记录为准。不承诺固定节省比例。

恢复时先查错误和当前页面，确认动作是否生效；失效 ref 重新读树，树缺失才按需截图。超时后不自动重放可能改变状态的动作。登录、验证码或风控提示停止该分支并记录受限，或改用可用来源；不声称能防封。

## 验证与 iOS

离线回归不安装 npm 依赖、不调用真实 adb/npx、不操作设备：

```bash
node --test tests/mobile.test.mjs
```

覆盖参数、symlink 入口与 import 无副作用、配置无探测、unauthorized/offline/absent/multiple、错误不转成功、超时与输出上限、固定启动参数、stdio/退出码、POSIX 信号和子孙进程清理。通过只说明 launcher 行为，真机须按上述流程验证；实际结果及设备阻塞见[验证记录](validation.md)。

iOS 按[上游要求](https://github.com/mobile-next/mobile-mcp#prerequisites)准备：模拟器需要 Xcode/Command Line Tools 与已启动目标，真机需要连接、信任及对应 mobilecli 平台准备。1.0.14 source 的 iOS 模拟器首次设备操作可能安装上游 agent，应按用户允许的范围执行。本 doctor 只检查 Android；本项目不安装/启动 iOS 环境，也不宣称 iOS 已实测。
