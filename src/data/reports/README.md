# 报告插件

每个报告文件夹都是一个可插拔的数据包。系统不直接从 PDF、网页或研报正文画图，而是读取报告包里的结构化结果。

一个报告包可以围绕某个公司、报告期或主题包含多份来源。财报通常是主来源，研报、官网产品页、问询回复、历史年报等可以作为辅助来源；关键是每条事实都能追溯到具体 `sourceId`。

当前新增报告包使用两阶段流程：

```text
主来源/辅助来源
  -> facts.json
  -> mapping.json
  -> extracted.json
  -> 前端图谱 / 财报详情页 / 时间线 / 标的观察表
```

## 目录结构

```text
reports/
  YYYY/
    YYYY-MM-DD_company_or_topic_period/
      facts.json        # AI 按来源原文填写的事实
      mapping.json      # AI 基于 facts + taxonomy 填写的图谱映射
      extracted.json    # 脚本生成的前端读取结果
      raw/              # 可选，本地来源缓存，Git 忽略
```

`YYYY` 使用报告的披露/发布日期年份，而不是财报所属期间年份。例如 2026-02-26 发布的 `2025 Form 10-K` 放在 `reports/2026/` 下，同时在 `facts.json` 的 `report.period` 中写 `2025`。

## 新增财报流程

1. 新建报告目录：

```text
src/data/reports/YYYY/YYYY-MM-DD_company_period/
```

2. 复制模板：

```text
src/data/reports/templates/report-facts.template.json   -> facts.json
src/data/reports/templates/report-mapping.template.json -> mapping.json
```

3. 阅读主来源和必要的辅助来源，按 `FACT_EXTRACTION_GUIDE.md` 填写 `facts.json`。

这一阶段只记录来源材料直接披露的事实，包括报告元信息、公司层面财务指标、业务/产品/下游/供应链等直接披露事项。不要读取 `nodes.json` 或 `edges.json`，不要写图谱节点、边、映射结论或置信度。主来源和辅助来源必须通过 `report.sources[].role`、`sourceId` 和 `sourceRole` 区分。

4. 基于 `facts.json`、`src/data/taxonomy/nodes.json` 和 `src/data/taxonomy/edges.json`，按 `MAPPING_GUIDE.md` 填写 `mapping.json`。

这一阶段才做产品节点覆盖、下游归因和可选的定性文字信号。AI 需要填写 `productNodes`、`downstreamAttributions`，以及无法量化但值得保留的 `qualitativeSignals`；真实存在的边、节点信号、边信号、置信度和兼容字段由脚本生成。

5. 生成 `extracted.json`：

```bash
npm run report-kit -- process-mapping src/data/reports/YYYY/YYYY-MM-DD_company_period/mapping.json --force
```

脚本默认读取同目录的 `facts.json`，并生成同目录的 `extracted.json`。

6. 校验所有报告和 taxonomy 引用：

```bash
npm run report-kit -- validate-reports
```

## 文件职责

- `facts.json`：只保存来源材料直接披露的事实和证据；不做图谱判断。
- `mapping.json`：保存基于 facts 和 taxonomy 的产品节点覆盖、财务增长口径、下游归因输入，以及不参与 YoY 计算的定性文字信号。
- `extracted.json`：脚本生成的机器可读结果，供图谱、时间线、详情页和汇总算法读取；不要手写或局部手改。
- `raw/`：可选的来源缓存。本目录被 Git 忽略；同一来源有 PDF、HTML、接口 JSON 等重复形态时，只保留最适合 AI 阅读的一份 UTF-8 文本化缓存。

`extracted.schema.json` 约束脚本输出结构。新增报告不要按这个 schema 直接写 `extracted.json`。

## 生成结果结构

```json
{
  "report": {},
  "metrics": [],
  "productCategoryMetrics": [],
  "graphSignals": [],
  "qualitativeSignals": [],
  "companySignals": [],
  "timelineEvents": [],
  "companyProductCoverage": [],
  "productGrowthInputs": [],
  "products": [],
  "mapping": {
    "productNodes": [],
    "downstreamAttributions": [],
    "qualitativeSignals": [],
    "productNodeSignals": [],
    "downstreamSignals": []
  },
  "notes": {}
}
```

- `report`：报告包元信息、发布时间、公司、来源链接和来源角色。
- `metrics`：从 `facts.json.financialMetrics` 派生的财务/业务指标。
- `productCategoryMetrics`：兼容字段，当前新流程中由脚本保留为空数组。
- `graphSignals`：可被产业链图谱使用的节点/边信号，例如 YoY 增长、需求读穿。
- `qualitativeSignals`：从 `mapping.json.qualitativeSignals` 派生的文字信号，例如需求强劲、扩产、长期订单、新产品 ramp、技术路线变化等；它只用于证据展示、检索或后续信号计数，不影响 YoY 线宽。
- `companySignals`：可被标的观察表使用的公司状态和相关产品节点。
- `timelineEvents`：可被变化时间线展示的事件。报告本身至少输出一条事件。
- `companyProductCoverage`：脚本从 `mapping.productNodes[].coverage` 派生的兼容字段，表示公司实际覆盖的产品/能力节点事实。
- `productGrowthInputs`：脚本从 `mapping.productNodes[].financial` 和自动生成的边信号派生的兼容字段，用于报告详情页展示。
- `mapping`：保留映射输入和脚本派生的产品节点/下游归因信号，也保留定性文字信号输入，便于详情页区分原文事实、映射判断和派生结果。
- `notes`：摘要、映射假设和局限性，供报告详情页展示，不参与置信度计算。

## 图谱信号规则

连接线默认读取脚本生成的 `graphSignals` 中指向边的 YoY 增长信号。图谱的日期选择器使用“真实状态回填”口径：按 `periodStart` / `periodEnd` 判断报告信号覆盖哪个经营周期，而不是按 `publishedAt` 判断当时是否已经披露。

选择某个观察日期时：

- 优先使用 `periodStart <= 观察日期 <= periodEnd` 的报告信号。
- 同时有季度、半年报、年报覆盖该日期时，优先使用覆盖周期更短的信号。
- 如果没有报告覆盖该日期，则使用观察日期之前最近结束的报告周期。
- `publishedAt` 仍用于来源追溯和时间线，不用于限制历史真实状态回填。

支持的边增长 metric：

- `revenue_growth_yoy_proxy`：用报告收入增长合理代理该边交易增长。
- `demand_growth_signal`：对相关链路的低置信度需求读穿。

## 时间线规则

时间线不再读取独立的 `events.json`。所有事件都来自报告包中脚本生成的 `timelineEvents`。

## 标的观察表规则

标的观察表不直接展示 `taxonomy/companies.json` 的全量公司清单。`taxonomy/companies.json` 只保留公司身份信息；观察表和节点覆盖公司都来自脚本生成的 `companySignals`。

`companySignals.fields.relatedNodeIds` 由 `mapping.productNodes[].coverage` 推导，只表示公司实际产品或方案覆盖的节点。下游客户、应用场景和需求传导不要写入产品覆盖；如果报告只能支持“该产品增长传导到下游节点”，应在 `mapping.json.downstreamAttributions` 中写明下游归因，并用归因字段降低置信度。

如果同一家公司有多个报告信号，前端默认展示置信度最高、报告期较新的记录。

## 约定

- JSON 只放结构化数据，不放长篇解读。
- PDF 不提交到 Git，只保留官方 URL 和本地忽略路径。
- 估算值由脚本在输出中标记 `estimated: true`。
- `confidence` 使用 `0` 到 `1`，由脚本计算。
- 同一节点/边出现多个信号时，前端默认展示最新且置信度最高的信号，详情页后续展示全部来源。
