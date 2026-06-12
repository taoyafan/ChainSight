# 财报事实提取 Guide

目标：AI 只生成 `facts.json`，记录财报原文直接披露的事实。不要在这里做图谱映射、节点判断、边判断或置信度计算。

## 输出文件

每份报告输出一个 `facts.json`，放在该报告目录下。

顶层只保留三个字段：

- `report`：报告元信息。
- `financialMetrics`：公司层面的关键财务指标。
- `reportedItems`：报告直接披露的业务、产品、下游、供应链、产能、采购、预付款、库存、研发等事实。

## 禁止事项

- 禁止读取或引用 `nodes.json`、`edges.json` 来反推财报事实。
- 禁止写图谱节点 ID、边 ID、taxonomy 名称或映射结论。
- 禁止写 `confidence`。
- 禁止把没有披露的数据补成结论；没有披露就留空数组或 `null`。
- 禁止把常识、新闻、互动易、研报等外部材料混入本报告事实，除非该材料作为独立来源单独建报告。

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
- `sources`：来源列表。

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

## `reportedItems`

记录所有对供应链分析有用的直接披露事实。可以是产品、业务类别、下游需求、客户投入、采购、预付款、库存、产能、研发、毛利率变化等。

每条字段：

- `id`：稳定 ID，供后续 `mapping.json` 引用。
- `label`：简短标题，使用财报原文名称或贴近原文的短语。
- `text`：对该事实的简短复述，不做图谱推断。
- `metrics`：该事实中包含的数值数组；没有数值则写 `[]`。
- `sourceText`：原文证据。
- `sourceSection`：来源章节。

`reportedItems.metrics` 的字段与 `financialMetrics` 相同。一个事实可以包含多个数值。

## 提取原则

- 原文披露了产品或业务类别，就按原文名称记录，不强行改成图谱名称。
- 原文只说“公司产品”“终端客户”“材料款”等笼统类别，就按笼统类别记录。
- 原文没有产品拆分、下游拆分或边的收入数据时，不要补写。
- 关键事实宁可少写，也不要把推断写进 `facts.json`。
