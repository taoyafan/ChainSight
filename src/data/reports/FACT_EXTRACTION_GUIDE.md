# 报告事实提取 Guide

目标：AI 只生成 `facts.json`，记录来源材料直接披露的事实。不要在这里做图谱映射、节点判断、边判断或置信度计算。

一个报告包可以围绕某个公司、报告期或主题放入多份来源材料。财报、公告、交易所问询、官网产品页、研报镜像等都可以作为来源，但必须在 `report.sources` 里区分主来源和辅助来源，并在每条事实上保留 `sourceId`。

## 输出文件

每个报告包输出一个 `facts.json`，放在该报告目录下。

顶层只保留三个字段：

- `report`：报告包元信息和来源列表。
- `financialMetrics`：公司层面的关键财务指标，通常来自主来源。
- `reportedItems`：来源材料直接披露的业务、产品、下游、供应链、产能、采购、预付款、库存、研发等事实。

## 来源角色

`report.sources[].role` 用于区分来源边界：

- `primary`：本报告包的主来源，例如本期财报、10-Q、年报、公告正文。
- `supporting`：辅助来源，例如研报、官网产品页、投资者关系问答、交易所问询回复、历史年报等。

同一来源有多种缓存形态时，`raw/` 只保留最适合 AI 阅读的一份文本化版本。PDF、网页 HTML、接口分页 JSON 如果内容重复，优先清洗成一个 UTF-8 `.txt` 或 `.md` 缓存。

## 禁止事项

- 禁止读取或引用 `nodes.json`、`edges.json` 来反推财报事实。
- 禁止写图谱节点 ID、边 ID、taxonomy 名称或映射结论。
- 禁止写 `confidence`。
- 禁止把没有披露的数据补成结论；没有披露就留空数组或 `null`。
- 禁止把没有登记在 `report.sources` 的常识、新闻、互动易、研报等材料混入事实。
- 禁止把辅助来源事实伪装成主来源事实。辅助材料可以进入 `reportedItems`，但必须写清 `sourceId` 和 `sourceRole: "supporting"`。

## `report`

记录报告本身，不做分析。

必填字段：

- `id`：报告目录 ID。
- `companyId`：公司 ID。
- `companyName`：公司全称。
- `title`：报告标题。
- `type`：报告类型，例如 `quarterly_report`、`annual_report`、`form_10q`。
- `period`：报告期，例如 `2026Q1`。
- `periodStart`：报告期开始日期。
- `periodEnd`：报告期结束日期。
- `publishedAt`：报告披露日期。
- `currency`：币种。
- `amountUnit`：金额单位。
- `sources`：来源列表；每条来源需要 `id`、`role`、`name`、`type`、`url` 或 `localPathIgnored`。

## `financialMetrics`

只放公司层面的关键财务指标，例如营业收入、营业成本、净利润、经营现金流、研发费用。

每条字段：

- `id`：稳定 ID，后续引用用。
- `label`：财报中的指标名称。
- `value`：本期数值；没有披露则 `null`。
- `unit`：单位，例如 `CNY`、`USD`、`percent`。
- `period`：该数值对应期间。
- `yoy`：同比，统一用小数；例如 192.12% 写 `1.9212`。没有披露则 `null`。
- `sourceText`：原文证据。
- `sourceSection`：来源章节。
- `sourceId`：来自 `report.sources[].id`。

## `reportedItems`

记录所有对供应链分析有用的直接披露事实。可以是产品、业务类别、下游需求、客户投入、采购、预付款、库存、产能、研发、毛利率变化等。

每条字段：

- `id`：稳定 ID，供后续 `mapping.json` 引用。
- `label`：简短标题，使用来源原文名称或贴近原文的短语。
- `text`：对该事实的简短复述，不做图谱推断。
- `metrics`：该事实中包含的数值数组；没有数值则写 `[]`。
- `factType`：可选的事实类型标签，例如 `demand_growth`、`capacity_expansion`、`long_term_order`、`new_product_ramp`、`technology_route`。它只描述原文事实类别，不代表图谱映射。
- `sentiment`：可选，原文事实的方向，例如 `positive`、`negative`、`neutral`、`mixed`。
- `magnitude`：可选，原文措辞强弱，例如 `strong`、`medium`、`weak`、`unknown`。
- `timeHorizon`：可选，原文指向的时间范围，例如 `current_quarter`、`next_12_months`、`multi_year`、`unknown`。
- `sourceText`：原文证据。
- `sourceSection`：来源章节。
- `sourceId`：来自 `report.sources[].id`。
- `sourceRole`：`primary` 或 `supporting`。

`reportedItems.metrics` 的字段与 `financialMetrics` 相同。一个事实可以包含多个数值。

这些轻量标签是给后续 `mapping.json.qualitativeSignals` 使用的索引线索。它们不能包含节点 ID、边 ID 或置信度，也不能把没有披露的数据补成映射结论。

## 提取原则

- 来源披露了产品或业务类别，就按原文名称记录，不强行改成图谱名称。
- 来源只说“公司产品”“终端客户”“材料款”等笼统类别，就按笼统类别记录。
- 来源没有产品拆分、下游拆分或边的收入数据时，不要补写。
- 主来源和辅助来源事实可以同时存在，但后续映射必须能通过 `factIds` 追溯到具体来源角色。
- 关键事实宁可少写，也不要把推断写进 `facts.json`。
