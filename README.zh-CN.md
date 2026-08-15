# DSH Landscape

[English](README.md) · [网站](https://cyanseek.github.io/dsh-landscape/) · [路线图](ROADMAP.md) · [参与贡献](CONTRIBUTING.md)

[![CI](https://github.com/cyanseek/dsh-landscape/actions/workflows/ci.yml/badge.svg)](https://github.com/cyanseek/dsh-landscape/actions/workflows/ci.yml)
[![Node.js >= 22](https://img.shields.io/badge/Node.js-%3E%3D22-339933?logo=node.js&logoColor=white)](package.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> **给 DeepSeek Harness 加能力之前，先问 Landscape。**

DSH Landscape 是一个只读的能力变更前置检查：用一句自然语言描述变更，在安装、替换、升级、组合或开发之前，先得到有证据支持的决策。

可以直接这样问：

- “我该安装浏览器自动化，还是现有能力已经覆盖？”
- “比较一下适合当前 DSH 的 GitHub 集成。”
- “替换现在的搜索插件会不会丢能力？”
- “准备开发 Linear 集成前，先告诉我哪些部分不要重复做。”

不需要 Landscape 账号，不需要 API Key，不需要初始化，也没有必填配置。即使运行环境检查或在线发现不可用，Landscape 仍会使用内置快照继续分析，并明确说明哪些信息没有核实。

## 快速开始

把固定 revision、可复现的 DSH bundle 安装到已有 Profile：

```bash
dsh plugin --profile web add github:cyanseek/dsh-landscape#2d3570aadbbd291dbfc58e2484e287bd14fa92e0
```

然后像平常一样直接问 DSH：

> 添加浏览器自动化之前，先检查当前环境和生态。告诉我该用什么、哪些不要重复开发，以及最安全的下一步。

原生工具名称是 `dsh_landscape`。Landscape 自身不需要 Profile 路径或设置；`--profile web` 只属于 DSH 的插件安装命令，请换成你已经在使用的 Profile。

## 一次 Preflight 会给出什么

下面是基于内置生态快照的精简示例：

```text
DSH 能力变更前置检查

需求
给我的 DSH 添加浏览器自动化。

当前环境
UNAVAILABLE — 没有运行时清单，但生态分析继续完成

现有覆盖
证据结论：CROWDED
- titanwings/dsh-automation — installable
- titanwings/dsh-better-browser — prototype

风险
- UNKNOWN：当前入口看不到已安装状态和兼容性。

决策
INSTALL

不要重复开发
- 已有成熟实现覆盖的自动化部分。

仅需新建
- 无。

下一步
先审阅领先项目的证据与安装说明；只有范围匹配时才执行变更。
```

结果是建议，不是自动操作。Landscape 不会安装、启用、禁用、升级、卸载、修改 Profile 或创建仓库。

## 为什么要先运行？

- 在投入实现前看到相关 DSH 插件和可移植能力。
- 区分占位项目、原型、可安装项目和有测试证据的实现。
- 当宿主安全提供信息时，检查当前运行时清单。
- 如实呈现重复项、兼容性未知、证据过期和发现不完整，不编造确定性。
- 给出一个直接动作：`USE`、`INSTALL`、`COMPOSE`、`EXTEND`、`BUILD`、`WAIT`、`DISABLE` 或 `INVESTIGATE`。
- 为下一位 Agent 或开发者保留清楚的 `Do Not Build` 和 `Build Only` 边界。

## 其他使用方式

### Agent Skill

无需永久安装，单次使用：

```bash
npx -y skills use cyanseek/dsh-landscape --skill dsh-landscape --agent codex
```

也可以安装可移植 Skill：

```bash
npx -y skills add cyanseek/dsh-landscape --skill dsh-landscape -g -a codex -y
```

Skill 会在 DSH 能力变更或开发之前先执行 Preflight，并复用宿主 Agent 做语义复核。

### CLI

直接传入需求，不需要选择模式：

```bash
npx -y github:cyanseek/dsh-landscape "Should I install browser automation for DSH?"
```

兼容的显式工作流继续保留：

```bash
npx -y github:cyanseek/dsh-landscape find "browser automation"
npx -y github:cyanseek/dsh-landscape analyze "Linear integration for DSH"
npx -y github:cyanseek/dsh-landscape brief "Linear integration for DSH" --format agent
npx -y github:cyanseek/dsh-landscape status --json
```

`analyze`、`find`、`brief` 及其现有参数，以及诊断用的 `status` 都继续支持。项目目前不宣传已发布到 npm；以上命令运行的是经过验证的 GitHub 源码。

<details>
<summary>可选的独立语义 Provider</summary>

正常 Preflight 不需要这些配置。只有独立 CLI 调用者明确需要 provider 语义分析时，才需要选择兼容端点：

```bash
export DSH_LANDSCAPE_API_KEY="your-key"
export DSH_LANDSCAPE_BASE_URL="https://your-provider.example/v1"
export DSH_LANDSCAPE_MODEL="your-model"
npx -y github:cyanseek/dsh-landscape analyze "Linear integration for DSH"
```

凭据值绝不会进入 Landscape 输出。

</details>

### 验证或移除 DSH 插件

```bash
dsh --profile web --dump-config
dsh plugin --profile web remove dsh-landscape
```

## 稳定结果约定

Preflight 只增加字段，不删除 v1 证据合同：

- `intent`：从自然语言需求自动推断；
- `environment`：状态为 `detected`、`partial`、`unavailable` 或 `not-applicable`；
- `decision`、`risks`、`doNotBuild`、`buildOnly`、`nextAction` 和 `limitations`；
- 原有 `verdict`、`recommendation`、`confidence`、`matches`、已覆盖/缺失能力、证据、新鲜度、intelligence 和 provisional 标记。

旧 consumer 可以直接忽略新字段。否定结论仍然保守：发现不完整、快照过期、现场核验失败或 search-only 不确定性都不能确认真实 GAP。

## 使用入口

| 入口 | 最适合 | 环境视图 |
|---|---|---|
| DSH 插件 | Harness 会话中的原生 Preflight | 尽力提供只读运行时摘要 |
| Agent Skill | Agent 变更或开发能力前的检查 | 由宿主决定，失败时安全降级 |
| CLI | 自然语言检查、自动化、JSON 与 brief | 没有宿主输入时只分析生态 |
| Node API | 应用集成 | 调用方提供，否则 unavailable |
| 静态站/API | 浏览器安全的快照探索 | not-applicable |

### Node API

```js
import { analyzeNeed, loadAliases, loadSnapshot } from 'dsh-landscape'

const [{ snapshot }, aliasData] = await Promise.all([loadSnapshot(), loadAliases()])
const result = await analyzeNeed('Should we build browser automation?', {
  snapshot,
  aliasData,
})

console.log(result.decision, result.nextAction)
```

版本化静态数据 API 生成在 [`site/api/v1`](site/api/v1) 下。

## 可信与安全边界

- 发现过程只读取有来源标记的公开元数据，不执行发现到的仓库代码。
- 成熟度标签需要可观察证据；仓库名称和 README 自述本身不能证明能力可用。
- 运行环境检查尽力而为且只读；宿主信息缺失会成为 limitation，不会变成配置提示。
- 环境输出排除本机绝对路径、凭据值、插件配置和原始检查错误。
- 默认不把 archived 项目计入活跃竞争；fork 会被标记并降低排序。

## 当前限制

- DeepSeek Harness 仍是 developer preview，可能引入破坏性变化。
- 公共发现无法覆盖所有 GitHub、npm、私有或本地项目。
- 当前公共运行时入口可能不提供活动 Profile、DSH 版本、bundle 来源或 peer compatibility；Landscape 会把这些信息标为 unknown。
- 基于 metadata 的成熟度判断刻意保守，不能代替运行时验收。
- 静态网站是 search-only 入口；需要宿主感知的判断时请使用 DSH 或 Agent Skill。

## 开发

需要 Node.js 22 或更高版本。项目没有运行时依赖，GitHub 插件安装也不会运行生命周期构建脚本。

```bash
npm run release:check
npm pack --dry-run
```

提交事实修改前请阅读 [参与贡献](CONTRIBUTING.md)、[安全策略](SECURITY.md) 和 issue forms。

## 许可证

[MIT](LICENSE) © 2026 cyanseek
