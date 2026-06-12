# 财报图谱映射 Guide

目标：基于 `facts.json` 生成 `mapping.json`。这一层可以读取 `facts.json`、`nodes.json` 和 `edges.json`，但不能再读取原始财报。

## 输入和输出

输入：

- `facts.json`：财报直接披露事实。
- `src/data/taxonomy/nodes.json`：当前图谱节点。
- `src/data/taxonomy/edges.json`：当前图谱边。

输出：

- `mapping.json`：AI 填写的产品节点和下游归因。
- `extracted.json`：脚本从 `facts.json` 和 `mapping.json` 生成的最终前端数据。

## 核心原则

- 产品端必须拆到所有相关父节点和子节点，防止漏写。
- 下游端必须写所有相关下游节点，防止漏写。
- AI 不需要枚举所有边。
- 边由脚本基于 `edges.json` 自动生成：只有 taxonomy 中真实存在的边才生成。
- 对外销售产品才计算边；内部自用或不对外销售的产品不计算财务和边。
- 如果存在“某个产品 -> 某个下游”的明确归因，它覆盖“笼统下游归因”。
- 置信度仍使用原来的二维表：`shareOfScope × managementAttribution`。

## 顶层结构

```json
{
  "reportId": "",
  "productNodes": [],
  "downstreamAttributions": []
}
```

## `productNodes`

每个相关产品节点都必须写一条，包括父节点和子节点。

```json
{
  "nodeId": "optical_module",
  "coverage": {
    "commercializationType": "external_sales",
    "factIds": ["item_001"],
    "evidenceText": "公司产品出货持续增长",
    "notes": ""
  },
  "financial": {
    "period": "2026Q1",
    "growthMetricId": "revenue",
    "growthValue": 1.9212,
    "growthValueType": "yoy_ratio",
    "revenueScope": "company_total",
    "scopeLabel": "公司整体营业收入",
    "shareOfScope": "high_over_80",
    "managementAttribution": "core_driver",
    "attributionEvidenceText": "营业收入增长主要原因是终端客户对算力基础设施投入，公司产品出货持续增长",
    "sourceMetricIds": ["revenue"],
    "notes": ""
  }
}
```

`coverage.commercializationType`：

| 值 | 含义 | 是否需要 `financial` | 是否自动计算边 |
| --- | --- | --- | --- |
| `external_sales` | 对外销售 | 是 | 是 |
| `internal_use_only` | 内部自用 | 否 | 否 |
| `r_and_d_or_sampling` | 研发、送样、验证中 | 否 | 否 |
| `not_revenue_product` | 有能力或产品但不是收入产品 | 否 | 否 |

## `downstreamAttributions`

这里记录下游归因，而不是手写边。

笼统下游归因：

```json
{
  "downstreamNodeId": "ai_server",
  "sourceProductNodeId": null,
  "factIds": ["item_001"],
  "shareOfScope": "medium_30_80_or_unknown",
  "managementAttribution": "core_driver",
  "attributionEvidenceText": "终端客户对算力基础设施的强劲投入",
  "sourceMetricIds": ["revenue"],
  "notes": ""
}
```

明确产品到下游归因：

```json
{
  "downstreamNodeId": "ai_server",
  "sourceProductNodeId": "silicon_photonic_pluggable_module",
  "factIds": ["item_010"],
  "shareOfScope": "high_over_80",
  "managementAttribution": "core_driver",
  "attributionEvidenceText": "硅光模块面向 AI 客户出货增长",
  "sourceMetricIds": ["revenue"],
  "notes": ""
}
```

脚本生成某条边时，优先使用 `sourceProductNodeId = 当前产品节点` 的归因；没有时使用 `sourceProductNodeId = null` 的笼统归因。

## 置信度计算

产品节点置信度：

```text
productConfidence = score(product.shareOfScope, product.managementAttribution)
```

下游归因置信度：

```text
downstreamConfidence = score(downstream.shareOfScope, downstream.managementAttribution)
```

自动边置信度：

```text
edgeConfidence = productConfidence × downstreamConfidence
```

父节点和子节点独立计算。父节点置信度高，不代表子节点也高；子节点如果只使用父级或公司整体收入作为 proxy，应通过 `shareOfScope` 和 `managementAttribution` 降低置信度。

## 脚本

```bash
npm run report-kit -- process-mapping src/data/reports/2026/example/mapping.json --force
```

默认读取同目录的 `facts.json`，并生成同目录的 `extracted.json`。前端只读取 `extracted.json`，不读取 `facts.json` 或 `mapping.json`。
