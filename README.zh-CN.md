# DSH Landscape

[English](README.md) · [MIT](LICENSE) · [路线图](ROADMAP.md)

> **知道什么已经有人做，发现什么还没人做。**

DSH Landscape 是面向 Agent 的 **DeepSeek Harness 插件与缺失能力生态情报层**。你只需用自然语言说出需求，它会查找相关 DSH 项目、区分真实实现与占坑/WIP、展示发现范围与新鲜度，并为“直接使用 / 扩展现有项目 / 值得新做 / 避免重复 / 继续调查”提供可追溯证据。

它不是另一个插件列表或安装器。这里的一等对象是你的**需求**，不是仓库。

## 在 Codex、DSH 或其他 Agent 中直接问

### 临时使用，不永久安装

```bash
npx -y skills use cyanseek/dsh-landscape --skill dsh-landscape --agent codex
```

然后直接问：

> DeepSeek Harness 已经有原生 Linear 集成了吗？如果没有，请准确说明缺什么，并准备一份开发简报。

通用的“只生成提示词”形式可以交给任意有能力的宿主：

```bash
npx -y skills use cyanseek/dsh-landscape --skill dsh-landscape
```

### 安装可移植 Agent Skill

```bash
npx -y skills add cyanseek/dsh-landscape --skill dsh-landscape -g -a codex -y
npx -y skills add cyanseek/dsh-landscape --skill dsh-landscape -g -y
```

作为 Agent Skill 使用时，DSH Landscape 复用宿主 Agent 已有的模型能力，不需要额外的 Landscape API key。独立运行时，完整语义分析需要配置 LLM 提供方；没有提供方时，CLI 会明确进入 search-only 模式。

## 也可以直接运行 CLI

npm 正式发布前可使用 GitHub 源码路径：

```bash
npx -y github:cyanseek/dsh-landscape find "browser automation"
npx -y github:cyanseek/dsh-landscape analyze "Linear integration for DSH"
npx -y github:cyanseek/dsh-landscape brief "Linear integration for DSH" --format agent
```

完整的独立语义分析可接入任意 OpenAI-compatible 提供方；显式 Landscape 配置优先：

```bash
export DSH_LANDSCAPE_API_KEY="your-key"
export DSH_LANDSCAPE_BASE_URL="https://your-provider.example/v1"
export DSH_LANDSCAPE_MODEL="your-model"
npx -y github:cyanseek/dsh-landscape analyze "Linear integration for DSH"
```

也可以用 DeepSeek 的标准 key 直接启用；若没有被上面的 Landscape 配置覆盖，CLI 会使用官方 API 地址和在 v0.1.0 发布检查中验证过的默认模型：

```bash
export DEEPSEEK_API_KEY="your-key"
npx -y github:cyanseek/dsh-landscape analyze "browser automation"
```

没有 Agent 或 LLM key 时，证据检索仍然可用：

```bash
npx -y github:cyanseek/dsh-landscape find "Linear"
```

v0.1.0 只在项目元数据中预留了包名，**尚未声称 npm 已发布**。正式验证发布前，本 README 不会宣传 `dsh-landscape@latest`。

## 20 秒看懂结果

以下是使用 2026-08-13 UTC 生成的随包快照得到的宿主 Agent 示例：

```text
结论：PARTIAL

已有覆盖
- fakechris/dsh-track — prototype — Linear 风格的本地 issue 存储
- dsh-external/dsh-track — unknown — 同类能力的目录条目

仍然缺失
- 连接 Linear 云端 issue 与 project 的、经过验证的原生连接器

建议：先 INVESTIGATE 两条记录；只有确认可复用本地 issue 引擎时才 EXTEND，否则 BUILD 连接器，但不要重复其任务模型。
置信度：限定于当前 GitHub topic + Awesome catalog，并经过 fresh 检索
智能来源：宿主 Agent 基于 DSH Landscape 证据完成语义判断
```

CLI 会把 host-Agent 结果标为待宿主复核的证据，因为最终语义比较由宿主完成。Search-only 模式绝不会把“没搜到”直接包装成语义 GAP。

## 三种智能模式

| 模式 | Key | 能诚实提供什么 |
|---|---:|---|
| 宿主 Agent | 不需要额外 Landscape key | 检索/核验证据；当前 Agent 完成需求拆解与建议 |
| 独立 LLM | 一个已配置的 OpenAI-compatible 提供方 | 发起真实请求，并区分 `configured`、`ready`、`failed`，绝不泄露 key |
| Search-only | 无 | 查找、排序、展示成熟度与来源；分析明确标为 provisional，负向结果保持 `UNKNOWN` |

只检查能力状态而不调用模型：

```bash
npx -y github:cyanseek/dsh-landscape status --json
```

`analyze` 与 `brief` 会自动执行同样的预检。使用 `--json` 时，stdout 保持纯 JSON，状态信息进入 stderr。

## 它与周边项目有什么不同

| 项目类型 | 主要回答 | 与 DSH Landscape 的关系 |
|---|---|---|
| Awesome list | 有哪些精选项目？ | 把目录作为带来源的证据，不复制列表体验 |
| OMDSH Hub | 可以浏览/管理什么？ | 数据可用时作为互补结构化来源 |
| Find Plugins | 应找/装哪个插件？ | 在检索之上判断能力覆盖、不确定性和缺失子能力 |
| Plugin Check | 仓库结构健康吗？ | 消费成熟度/健康证据，不重复静态仓库检查 |
| Compatibility radar | 什么变了或坏了？ | 后续可消费运行证据，但不把监控做成核心产品 |
| **DSH Landscape** | **针对我的需求，哪里已覆盖、哪里缺失、下一步做什么？** | 需求 → 证据 → 覆盖 → 缺失能力 → 行动 |

## 命令

Phase 1 只有三个一等命令：

```text
analyze <need>   基于证据分析覆盖。选项：--json --limit --fresh --snapshot --host-agent
find <query>     直接、确定性地检索项目/能力。选项：--json --limit --snapshot
brief <need>     生成 Markdown、JSON 或编码 Agent 交接。选项：--json --format markdown|agent --fresh
```

`status` 只是轻量诊断工具，不是第四条业务工作流。

## 可信规则

- 每条影响结论的项目记录都保留来源。
- `placeholder`、`prototype`、`installable`、`tested` 都由证据决定；`verified` 只留给运行时验收证据。
- 仓库存在或 README 自述不等于需求已经解决。
- GAP 必须同时满足：已配置来源完整、快照新鲜；fresh 检索发生实质失败时降级为 UNKNOWN。
- 默认不把 archived 仓库计入活跃竞争；fork 会明确标记并降权。
- 扫描器不执行外部仓库代码。
- API key 的值不会被打印、序列化或写入 fixture。

## Agent Skill 与本地使用

可移植 Skill 位于 [`skills/dsh-landscape`](skills/dsh-landscape)。Codex 与当前 DSH 都能从 `.agents/skills` 发现仓库级 Skill。

```bash
mkdir -p .agents/skills
cp -R skills/dsh-landscape .agents/skills/dsh-landscape
```

Skill 会显式向 CLI 传递 `--host-agent <name>`。人不需要配置环境变量，也不需要再提供一个模型 key。

## Node API

```js
import {
  analyzeNeed,
  buildBrief,
  findPlugins,
  loadAliases,
  loadSnapshot,
} from 'dsh-landscape'

const { snapshot } = await loadSnapshot()
const aliasData = await loadAliases()
const matches = findPlugins('浏览器自动化', { snapshot, aliasData, limit: 5 })
```

CLI 与库复用同一核心；静态站使用同一批面向浏览器的检索与 verdict 模块生成物。

## 数据与静态 API

Phase 1 合并、去重两个独立公开来源：

1. GitHub 公共 [`dsh-plugin` topic](https://github.com/topics/dsh-plugin)；
2. 持续维护的 [Awesome DeepSeek Harness catalog](https://github.com/0xsline/awesome-deepseek-harness/blob/main/CATALOG.md)。

随包快照保证离线检索可用。运行时依次尝试 GitHub 最新 raw 快照、本地缓存、随包快照。生成的版本化端点位于 [`site/api/v1`](site/api/v1)：`snapshot.json`、`plugins.json`、`capabilities.json`、`gaps.json`。

`gaps.json` 只保存明确标注的“快照衍生线索”，不宣称它们是全局缺口。

## 参与贡献

可以修正误判、补充证据、改善能力别名或增强来源适配器。事实修正必须带证据 URL。参见 [CONTRIBUTING.md](CONTRIBUTING.md) 与 issue forms。

## 当前限制

- DeepSeek Harness 仍是 developer preview，可能发生破坏性兼容变更。
- Phase 1 覆盖已配置 topic 与 catalog，不代表 GitHub 或 npm 的全部项目。
- 基于元数据的成熟度刻意保守；`tested` 不等于运行时已验证。
- 完整独立语义分析取决于配置提供方的可用性和输出质量。
- 网站是 search-only 发现界面；完整语义判断请使用 Agent Skill 或独立提供方。

## 路线图与发现性

Phase 2 计划包括更多来源、能力图谱、需求信号、运行证据、历史快照及可选 MCP/API。详见 [ROADMAP.md](ROADMAP.md)。

建议仓库 topics：`deepseek-harness`、`dsh-plugin`、`agent-skills`、`plugin-discovery`、`ecosystem`、`gap-analysis`、`codex`。

## 许可证

[MIT](LICENSE) © 2026 cyanseek
