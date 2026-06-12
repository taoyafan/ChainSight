# 财报提取操作指南

目标：新增财报时只让 AI 填一份事实模板，再由脚本统一校验、计算派生字段、计算置信度并生成系统读取的 `extracted.json`。

## 固定流程

1. 复制模板：`src/data/reports/templates/report-extraction.template.json`
2. 在报告目录中保存为：`extraction.json`
3. AI 只填写财报可提取的稳定事实：
   - 报告元信息：`report`
   - 公司整体财务指标：`metrics`
   - 财报披露的分产品/产品大类财务数据：`productCategoryMetrics`
   - 公司实际覆盖的产品节点、商业化类型、财务数据和输出边判断：`products`
   - 时间线事件：`timelineEvents`
   - 人读说明素材：`notes`
4. 运行脚本生成系统文件：

```bash
npm run report-kit -- process-extraction src/data/reports/2026/example/extraction.json --force
```

脚本只生成或覆盖 `extracted.json`。不要手写或局部修改 `extracted.json`。

## 数据与推断分工

`extraction.json` 只记录财报事实。AI 不在模板里手算毛利、毛利率、置信度或图谱信号。

脚本推导：

- `graphSignals`
- `companySignals`
- `confidence`
- `confidenceFactors`
- 公司整体 `gross_profit` / `gross_margin`
- 产品大类 `grossProfit` / `grossMargin`

只要 `metrics` 中有 `revenue` 和 `operating_cost` / `cost_of_revenue`，脚本会补算公司整体毛利和毛利率。只要 `productCategoryMetrics` 中某个产品大类有 `revenue` 和 `operatingCost`，脚本会补算该产品大类毛利和毛利率。

## 产品大类数据

如果财报按产品、业务大类、分部披露收入、成本、毛利率或同比变化，必须逐项写入 `productCategoryMetrics`。披露了哪些产品大类，就记录哪些产品大类；不要只记录当前最关心的一项。

填写规则：

- `revenue`：披露了产品大类收入就填，否则 `null`。
- `operatingCost`：披露了产品大类营业成本/销售成本就填，否则 `null`。
- `grossProfit`：只有财报直接披露毛利时才填；否则 `null`，交给脚本算。
- `grossMargin`：只有财报直接披露毛利率时才填；否则 `null`，交给脚本算。
- `revenueYoy`、`operatingCostYoy`、`grossProfitYoy`、`grossMarginChangePpt`：只填报告直接披露的同比或百分点变化。
- `mappedNodeIds`：只填能直接对应到图谱产品节点的节点；不要把宽产品大类硬拆给更细产品。

季度报告经常不披露分产品数据；年报、半年报、招股书更常见。

## 置信度规则

置信度只由两个必填字段决定：

- `shareOfScope`：A 在所用收入分类中的占比。
- `managementAttribution`：管理层是否把增长归因到 A。

矩阵如下：

| A 在分类中占比 / 管理层归因 | `core_driver` 明确点名 A 是主要/核心驱动 | `mentioned_contributor` 笼统提及 A 有贡献 | `not_mentioned` 未提及 A |
|---|---:|---:|---:|
| `high_over_80` 极高（>80%） | 1.00 | 0.85 | 0.75 |
| `medium_30_80_or_unknown` 中等（30%-80%）或占比不详 | 0.85 | 0.60 | 0.35 |
| `low_under_30_or_mixed` 低（<30%），或所用收入分类至少混入 5 个不相关/非等价节点 | 0.75 | 0.45 | 0.10 |

查看某个组合：

```bash
npm run report-kit -- score-confidence --share-of-scope medium_30_80_or_unknown --management-attribution core_driver
```

## 字段规则

`products[].coverage` 只表示公司实际有这个产品或能力。

可以写：

- 财报、年报、招股书、公告、官网产品目录明确列出的产品。
- 公司明确披露生产、销售、提供该类产品或方案。
- 公司明确具备该节点对应能力。

不要写：

- 下游客户所在节点。
- 应用场景节点，例如 AI 服务器。
- 只从产业链上下游关系推出来的节点。

`products[].financial` 表示“用哪条财报事实去推某个产品节点的增长”。

必填判断：

- `growthMetricId`：使用哪个指标，通常是 `revenue`。
- `growthValue` / `growthValueType`：增长值和类型。
- `revenueScope` / `scopeLabel`：这个增长值的收入口径。
- `shareOfScope`：目标产品在该收入口径中的占比档位。
- `managementAttribution`：管理层归因明确度。
- `notes`：为什么这样映射，以及缺什么数据。

如果报告没有披露产品级收入或增速，可以继续使用公司整体收入做低置信度 proxy，但必须把 `revenueScope`、`shareOfScope`、`managementAttribution` 写清楚。

`low_under_30_or_mixed` 只能在两种情况下使用：有证据显示目标产品占所用收入口径低于 30%；或者所用收入口径至少混入 5 个不相关/非等价节点。只有两个或三个相邻产品节点拆分不明时，不要用这一档，应使用 `medium_30_80_or_unknown`。

## products 字段规则（新版）

新增报告只写 `products`，不要再手写 `companyProductCoverage` 或 `productGrowthInputs`。每个产品节点只写一次：

- `coverage`：公司是否做这个产品、证据是什么、是否对外销售。
- `financial`：该产品节点可用的收入/增长数据；内部自用、研发送样或非收入产品可填 `null`。
- `edges`：该产品对每个输出边的下游销售/归因判断。

`coverage.commercializationType` 规则：

| 值 | 含义 | 是否需要 `financial` | 是否强制写全输出边 |
|---|---|---:|---:|
| `external_sales` | 对外销售 | 有数据则写 | 是 |
| `internal_use_only` | 内部自用 | 否 | 否 |
| `r_and_d_or_sampling` | 研发/送样 | 否 | 否 |
| `not_revenue_product` | 有能力但不是收入产品 | 否 | 否 |

`external_sales` 产品如果在 `edges.json` 中有输出边，`products[].edges` 必须覆盖全部输出边。即使明确不向某个下游销售，也要写一条：

```json
{
  "target": "downstream_node",
  "salesStatus": "not_sold",
  "edgeAttribution": "not_applicable",
  "evidenceText": "财报或公司资料显示该产品不销售至该下游。",
  "sourceMetricIds": [],
  "notes": ""
}
```

脚本先按 `financial.shareOfScope` 和 `financial.managementAttribution` 计算节点置信度，再按 `edges[].salesStatus` 和 `edges[].edgeAttribution` 计算边归因系数：

```text
edgeConfidence = nodeConfidence × edgeConfidenceFactor
```

## notes

`notes` 是说明素材，不是另一个数据源，也不参与置信度计算：

- `summary`：报告摘要，可作为默认时间线摘要。
- `mappingAssumptions`：节点/边映射假设。
- `limitations`：缺失数据和使用限制。

这些字段会进入 `extracted.json.notes`，供前端报告详情页展示；不再生成 `note.md`。

## 拓扑冲突中断规则

解读财报并填写 `extraction.json` 之前，必须先用当前 `src/data/taxonomy/nodes.json` 和 `src/data/taxonomy/edges.json` 对照产品节点和上下游链路。

`taxonomy` 只用于理解当前图谱有哪些节点和连线，不能作为公司覆盖某个节点、某条边或某个产品增长的证据。公司是否覆盖节点、是否对外销售、增长来自哪里，必须来自本次财报、公告、官网或其他明确引用的外部资料。

如果财报、官网、公告或可靠资料显示公司的真实业务链路与当前节点/连线构成不符，必须立即中断提取，不要继续填写 `extraction.json`，也不要用相近节点或相近连线临时代替。先与使用者讨论拓扑应如何修改，再重新开始财报提取。

需要中断的典型情况：

- 公司产品实际需要某个上游节点，但当前拓扑没有该上游节点到该产品节点的连线。
- 公司业务明确跨越两个节点，但当前拓扑把两者画成无交互关系。
- 当前节点定义过宽或过窄，导致同一财报事实可以被错误映射到多个不等价节点。
- 现有连线方向、上下游关系或产品路径与公司披露的业务流程相反。
- 为了让财报“能落图”，必须新增、删除、拆分或合并节点/连线。

例：如果发现某公司会采购 EML 光芯片并用于 EML 光引擎，而当前拓扑中 `eml_laser_chip` 与 `eml_transmit_engine` 没有任何交互关系，这不是低置信度映射问题，而是拓扑结构可能错误。此时必须停止解读，先讨论是否新增 `eml_laser_chip -> eml_transmit_engine` 连线，或是否拆分/重命名相关光引擎节点。

## 校验

每次处理后运行：

```bash
npm run report-kit -- validate-reports
npm run build
```

## 禁止事项

- 不要手写或局部修改 `extracted.json`。
- 不要在 `extraction.json` 里手算毛利、毛利率或置信度。
- 不要把净利润增速当作产品收入增速。
- 不要因为某产品在产业链上游，就自动给所有下游节点或边挂增长。
- 不要把同一个宽口径收入重复当作多个产品的高置信度收入。
- 不要把客户、应用场景、服务器厂商写进公司产品覆盖节点。
- 不要把 `taxonomy/nodes.json`、`taxonomy/edges.json` 或图谱底图当作财报证据来源。
