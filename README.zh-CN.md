# DSH Landscape

[English](README.md) · [路线图](ROADMAP.md) · [参与贡献](CONTRIBUTING.md)

[![CI](https://github.com/cyanseek/dsh-landscape/actions/workflows/ci.yml/badge.svg)](https://github.com/cyanseek/dsh-landscape/actions/workflows/ci.yml)
[![Node.js >= 22](https://img.shields.io/badge/Node.js-%3E%3D22-339933?logo=node.js&logoColor=white)](package.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> **先弄清已有能力，再决定是否新建。**

DSH Landscape 回答一个实际问题：面对一项能力需求，DeepSeek Harness 生态里已经有什么、还缺什么，以及应该直接使用、扩展、继续核验还是新建？

它把插件发现、基于证据的成熟度、覆盖感知 verdict 和 fresh 核验组合在一起。仓库名称或 README 自述本身不算“能力已解决”的证据。

## 你会得到什么

- 原生 DSH 工具：`dsh_landscape`。
- 以需求为入口的 `analyze`、`find`、`brief` CLI 工作流。
- 可供 Codex、DSH 和其他兼容宿主使用的可移植 Agent Skill。
- 带来源、成熟度、新鲜度、不确定性和下一步建议的结构化证据。

## 快速开始：作为 DSH 插件安装

把已验证且可复现的版本安装到 DSH profile：

```bash
dsh plugin --profile web add github:cyanseek/dsh-landscape#1ef0e1ebbb5e84e8d2feed31ae71d1b97322f6f9
dsh --profile web --dump-config
```

bundle 会注册 `dsh_landscape`。可以直接向 DSH 提出类似需求：

> 检查 DSH 是否已有原生 Linear 集成，展示证据并告诉我是应该使用、扩展还是新建。

在 DSH 内不需要单独的 Landscape 模型 key。工具负责检索和核验证据，最终语义判断由宿主模型完成。

### 运行参数

| 参数 | 默认值 | 含义 |
|---|---:|---|
| `need` | 必填 | 用自然语言描述的能力或集成需求 |
| `limit` | `10` | 最多返回 1 到 20 个匹配项目 |
| `fresh` | `true` | 通过 GitHub search 现场核验否定或不确定结果 |

插件没有必填配置。匿名 GitHub search 开箱即用；已有的 `GITHUB_TOKEN` 可提高 API 限额，其值绝不会进入工具输出。

### 卸载

```bash
dsh plugin --profile web remove dsh-landscape
```

移除 bundle 时 DSH 会注销该工具。请把 `web` 换成你实际使用的 profile。

## 作为 Agent Skill 使用

无需永久安装，单次使用：

```bash
npx -y skills use cyanseek/dsh-landscape --skill dsh-landscape --agent codex
```

也可以安装可移植 Skill：

```bash
npx -y skills add cyanseek/dsh-landscape --skill dsh-landscape -g -a codex -y
```

其他能力足够的宿主可省略 `--agent codex`，使用通用 prompt-only 形式。

## 运行 CLI

无需 npm 发布，直接使用 GitHub 源码：

```bash
npx -y github:cyanseek/dsh-landscape find "browser automation"
npx -y github:cyanseek/dsh-landscape analyze "Linear integration for DSH"
npx -y github:cyanseek/dsh-landscape brief "Linear integration for DSH" --format agent
```

作为 Agent 工作流运行时，Landscape 会复用宿主的语义能力。需要独立运行完整语义分析时，配置一个 OpenAI-compatible provider：

```bash
export DSH_LANDSCAPE_API_KEY="your-key"
export DSH_LANDSCAPE_BASE_URL="https://your-provider.example/v1"
export DSH_LANDSCAPE_MODEL="your-model"
npx -y github:cyanseek/dsh-landscape analyze "Linear integration for DSH"
```

没有 key 时仍可检索，否定结果会明确保持 provisional。以下命令不会发起模型请求，可检查当前 intelligence mode：

```bash
npx -y github:cyanseek/dsh-landscape status --json
```

项目目前不宣传已发布到 npm；请使用上面已验证的 GitHub 源码命令。

## 结果约定

结果包括：

- 识别出的能力和排序后的匹配项目；
- 每个匹配项的成熟度与来源证据；
- 已覆盖与仍缺失的子能力；
- 发现范围的完整性和新鲜度；
- `covered`、`partial`、`crowded`、`placeholder-only`、`gap` 或 `unknown` verdict；
- `use`、`extend`、`build`、`avoid-duplication` 或 `investigate` 建议。

`gap` 被刻意设置为高门槛。发现范围不完整、快照过期、fresh 核验失败或只有 search-only 推理时，否定结论都会降级为 `unknown`。

## 使用入口

| 入口 | 最适合 | 语义推理来源 |
|---|---|---|
| DSH 插件 | Harness 会话中的原生检查 | DSH 宿主模型 |
| Agent Skill | 单次或长期安装的 Agent 工作流 | 宿主 Agent |
| CLI | 自动化、JSON 输出和 brief | 已配置 provider 或透明 search-only 模式 |
| Node API | 应用集成 | 由调用方决定 |
| 静态 API | 浏览器安全的快照探索 | Search-only |

### Node API

```js
import { findPlugins, loadAliases, loadSnapshot } from 'dsh-landscape'

const { snapshot } = await loadSnapshot()
const aliasData = await loadAliases()
const matches = findPlugins('browser automation', { snapshot, aliasData, limit: 5 })
```

版本化静态数据生成在 [`site/api/v1`](site/api/v1) 下。

## 数据与可信边界

当前快照合并并去重两个带来源标记的公开数据源：

1. GitHub 公共 [`dsh-plugin` topic](https://github.com/topics/dsh-plugin)；
2. [Awesome DeepSeek Harness catalog](https://github.com/0xsline/awesome-deepseek-harness/blob/main/CATALOG.md)。

可信规则：

- `placeholder`、`prototype`、`installable`、`tested` 都需要可观察证据；`verified` 只留给运行时验收证据。
- 默认不把 archived 仓库计入活跃竞争；fork 会明确标记并降低排序。
- 发现过程中绝不执行外部仓库代码。
- 每条影响 verdict 的项目记录都保留来源。
- API key 的值绝不会被打印、序列化或写入 fixture。

## 当前限制

- DeepSeek Harness 仍是 developer preview，可能引入破坏性变化。
- 覆盖范围仅限已配置的公开来源，不代表 GitHub 或 npm 的全部项目。
- 基于 metadata 的成熟度判断刻意保守，不能替代运行时验证。
- 现场核验受 GitHub 可用性和 API 限额影响。
- 静态网站是 search-only 界面；语义判断请使用 DSH、Agent Skill 或已配置的 provider。

## 开发

需要 Node.js 22 或更高版本。仓库没有运行时依赖，GitHub 插件安装也不会运行生命周期构建脚本。

```bash
npm run release:check
npm pack --dry-run
```

release check 会运行语法检查、测试、静态构建、数据校验和 Skill 校验。提交事实修改前请阅读 [参与贡献](CONTRIBUTING.md)、[安全策略](SECURITY.md) 和 issue forms。

## 许可证

[MIT](LICENSE) © 2026 cyanseek
