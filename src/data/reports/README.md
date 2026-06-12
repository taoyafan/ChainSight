# 报告插件

每个报告文件夹都是一个可插拔的数据包。系统不直接从 PDF、网页或研报正文画图，而是读取每个报告包里的结构化提取结果。

## 目录结构

```text
reports/
  YYYY/
    YYYY-MM-DD_company_or_topic_period/
      extraction.json     # AI 按模板填写的财报事实
      extracted.json
      raw/              # 可选，本地原始文件，Git 忽略
```

`YYYY` 使用报告的披露/发布日期年份，而不是财报所属期间年份。例如 2026-02-26 发布的 `2025 Form 10-K` 放在 `reports/2026/` 下，同时在 `extraction.json` 的 `report.period` 中写 `2025`。

## 文件职责

- `extraction.json`：唯一应人工/AI 维护的事实模板输入。
- `extracted.json`：脚本生成的机器可读结果，供图谱、时间线、详情页和汇总算法读取；不要手写或局部手改。
- `raw/`：可选的 PDF、网页缓存或附件。本目录被 Git 忽略。

## 生成结果结构

```json
{
  "report": {},
  "metrics": [],
  "graphSignals": [],
  "companySignals": [],
  "timelineEvents": [],
  "products": [],
  "companyProductCoverage": [],
  "productCategoryMetrics": [],
  "productGrowthInputs": [],
  "notes": {}
}
```

- `report`：报告元信息、发布时间、公司、来源链接。
- `metrics`：报告披露或推导出的财务/业务指标。
- `graphSignals`：可被产业链图谱使用的节点/边信号，例如 YoY 增长、利润率、需求读穿、瓶颈信号。
- `companySignals`：可被标的观察表使用的公司状态、产业链位置、技术路线、客户和量产窗口。
- `timelineEvents`：可被变化时间线展示的事件。报告本身也应该至少输出一条事件。
- `products`：新增报告的产品事实入口；每个产品节点只写一次，包含覆盖证据、商业化类型、可选财务数据和输出边判断。
- `companyProductCoverage`：脚本从 `products[].coverage` 派生的兼容字段，表示公司实际覆盖的产品/能力节点事实。
- `productCategoryMetrics`：财报披露的分产品/产品大类财务数据，披露什么就记录什么；毛利、毛利率可由脚本根据收入和成本派生。
- `productGrowthInputs`：脚本从 `products[].financial` 和 `products[].edges` 派生的兼容字段，用于报告详情页展示。
- `notes`：摘要、映射假设和局限性，供报告详情页展示，不参与置信度计算。

`extracted.schema.json` 约束脚本输出结构。新增报告不要按这个 schema 直接写 `extracted.json`，而是按模板写 `extraction.json`。

新增报告时先阅读 `EXTRACTION_GUIDE.md`，按模板填写 `extraction.json`，再用脚本生成结果文件：

```bash
npm run report-kit -- process-extraction src/data/reports/2026/example/extraction.json --force
npm run report-kit -- validate-reports
```

脚本负责格式化、引用校验和置信度口径统一；`extraction.json` 负责保存财报事实和说明素材，不能替代人工阅读财报原文。

## 产品大类财务数据

如果财报按产品、业务大类或分部披露了收入、成本、毛利率等数据，必须逐项写入 `productCategoryMetrics`。不要只摘和当前图谱节点直接相关的几项；披露了哪些产品大类就记录哪些，后续脚本和前端再决定如何使用。

填写规则：

- 只填财报直接披露的原始字段；不要在 `extraction.json` 里手算毛利或毛利率。
- 如果披露收入和营业成本，把 `revenue`、`operatingCost` 填上，`grossProfit`、`grossMargin` 可以留 `null`，脚本会派生。
- 如果财报直接披露毛利率但没有披露成本，可以只填 `grossMargin`。
- `mappedNodeIds` 只填能直接映射的产品节点；不能硬拆到更细产品。

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

脚本输出示例：

```json
{
  "target": {
    "type": "edge",
    "source": "eml_pluggable_module",
    "target": "data_center_switch"
  },
  "metric": "revenue_growth_yoy_proxy",
  "value": 1.9212,
  "unit": "yoy_ratio",
  "period": "2026Q1",
  "estimated": true,
  "confidence": 0.76,
  "method": "company_revenue_growth_proxy"
}
```

## 时间线规则

时间线不再读取独立的 `events.json`。所有事件都来自报告包中脚本生成的 `timelineEvents`。

脚本输出示例：

```json
{
  "id": "innolight-2026q1-report-published",
  "date": "2026-04-17",
  "type": "financial_report",
  "title": "中际旭创发布 2026 年一季度报告",
  "summary": "营业收入同比 +192.1%，归母净利润同比 +262.3%。",
    "relatedNodeIds": ["eml_pluggable_module", "data_center_switch"],
  "relatedCompanyIds": ["zhongji_innolight"],
  "sourceReportId": "2026-04-17_zhongji-innolight_2026q1"
}
```

## 标的观察表规则

标的观察表不直接展示 `taxonomy/companies.json` 的全量公司清单。`taxonomy/companies.json` 只保留公司身份信息；观察表和节点覆盖公司都来自脚本生成的 `companySignals`。

脚本输出示例：

```json
{
  "id": "innolight-2026q1-company-watch-profile",
  "companyId": "zhongji_innolight",
  "period": "2026Q1",
  "fields": {
    "layer": "module",
    "techRoute": "高速可插拔光模块",
    "stage": "mass_prod",
    "massProductionEta": "已量产",
    "keyCustomers": ["云数据中心客户", "通信设备商"],
    "relatedNodeIds": ["eml_pluggable_module"]
  },
  "estimated": true,
  "confidence": 0.76,
  "method": "primary_business_and_industry_mapping"
}
```

`companySignals.fields.relatedNodeIds` 由 `extraction.json.products[].coverage` 推导，只表示公司实际产品或方案覆盖的节点。下游客户、应用场景和需求传导不要写入产品覆盖；如果报告只能支持“该产品增长传导到下游节点”，应在 `products[].edges` 中写明目标下游，并用边归因字段降低置信度。

`products[].coverage.commercializationType` 控制校验规则：

- `external_sales`：对外销售；如果该节点在拓扑中有输出边，`products[].edges` 必须覆盖全部输出边。
- `internal_use_only`：内部自用；不需要财务数据，也不校验输出边。
- `r_and_d_or_sampling`：研发/送样；不需要财务数据，也不校验输出边。
- `not_revenue_product`：有能力但不是收入产品；不需要财务数据，也不校验输出边。

光通信节点应尽量拆清楚：`cw_light_source` 表示面向硅光/CPO/OIO 的外置 CW 光源/激光芯片；`eml_laser_chip` 表示面向 EML 路线的 EML/DFB 发射端光通信激光芯片；`eml_transmit_engine` 表示 EML/DFB 可插拔光模块内部的 EML 光引擎/发射组件；`silicon_photonic_engine` 表示硅光引擎；`silicon_photonic_integrated_pd` 表示进入硅光引擎或 CPO 模组的集成 PD；`eml_pd_module` 表示进入 EML/DFB 可插拔光模块的 PD 模块。不要把 EML/DFB 光通信芯片简单并入 CW 光源，也不要把上游激光芯片厂商标成光模块或服务器厂商。

光隔离器链路按 `faraday_rotator -> optical_isolator -> eml_pluggable_module / silicon_photonic_pluggable_module` 映射。公司只披露“光隔离器”时，只覆盖 `optical_isolator`；明确披露“法拉第旋转片/磁光旋转片/磁光晶体”时，才覆盖 `faraday_rotator`。

如果同一家公司有多个报告信号，前端默认展示置信度最高、报告期较新的记录。

## 约定

- JSON 只放结构化数据，不放长篇解读。
- 解释、假设、局限性先写到 `extraction.json.notes`，再进入 `extracted.json.notes` 供前端展示；这些文字不参与置信度计算。
- PDF 不提交到 Git，只保留官方 URL 和本地忽略路径。
- 估算值由脚本在输出中标记 `estimated: true`。
- `confidence` 使用 `0` 到 `1`，由脚本计算。
- 同一节点/边出现多个信号时，前端默认展示最新且置信度最高的信号，详情页后续展示全部来源。
