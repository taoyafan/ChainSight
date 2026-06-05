# 连接线本体说明

`taxonomy/edges.json` 描述产业链相邻节点之间的基础产品/服务流向。它属于产业链本体，也就是图谱底图，不应该承载会随报告变化的分析结论。

## 方向

每条边的方向都是：

```text
source -> target
```

含义是 `source` 向 `target` 销售产品或服务。对 `source` 来说是下游收入，对 `target` 来说是上游支出。

## 基础交易金额

当前仍保留一个底层估计字段：

```json
"transactionAmountQuarterUsd": 120000000
```

规则：

- 单位：美元/季度。
- 含义：`source` 到 `target` 的季度交易金额估计。
- 不要写归一化分数，例如 `0.8` 或 `1.0`。
- 不要直接写年度收入，必须先换算为季度金额。
- 这个字段只是本体层的背景估计，不再驱动默认线宽，也不在边 tooltip 中展示。

## 默认线宽语义

前端默认把连接线设计为“季度同比增长信号”：

- 时间单位：季度 YoY，例如 `2026Q1` 对比 `2025Q1`。
- 数据来源：`src/data/reports/**/extracted.json` 的 `graphSignals`。
- 可驱动线宽的 metric：
  - `revenue_growth_yoy_proxy`
  - `demand_growth_signal`
- 中性宽度：约 `6px`，表示没有报告增长数据或接近 0% YoY。
- 正增长：线条比中性宽，颜色为绿色；增长越高越粗，最高约 `24px`。
- 负增长：线条比中性窄，颜色为红色；下降越大越细，最低约 `1.2px`。

因此，以后不要为了“让线变粗”去改 `transactionAmountQuarterUsd`。应当在对应报告文件夹的 `extracted.json` 中增加 `graphSignals`，并写清楚 period、value、confidence 和 method。
