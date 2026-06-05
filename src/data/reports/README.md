# 报告插件

每个报告文件夹都是一个可插拔的数据包。系统不直接从 PDF、网页或研报正文画图，而是读取每个报告包里的结构化提取结果。

## 目录结构

```text
reports/
  YYYY/
    YYYY-MM-DD_company_or_topic_period/
      extracted.json
      note.md
      raw/              # 可选，本地原始文件，Git 忽略
```

`YYYY` 使用报告的披露/发布日期年份，而不是财报所属期间年份。例如 2026-02-26 发布的 `2025 Form 10-K` 放在 `reports/2026/` 下，同时在 `extracted.json` 的 `report.period` 中写 `2025`。

## 文件职责

- `extracted.json`：机器可读的结构化结果，供图谱、时间线、详情页和汇总算法读取。
- `note.md`：人读的简要解读、假设、局限性和口径说明。
- `raw/`：可选的 PDF、网页缓存或附件。本目录被 Git 忽略。

## extracted.json 顶层结构

```json
{
  "report": {},
  "metrics": [],
  "graphSignals": [],
  "companySignals": [],
  "timelineEvents": []
}
```

- `report`：报告元信息、发布时间、公司、来源链接。
- `metrics`：报告披露或推导出的财务/业务指标。
- `graphSignals`：可被产业链图谱使用的节点/边信号，例如 YoY 增长、利润率、需求读穿、瓶颈信号。
- `companySignals`：可被标的观察表使用的公司状态、产业链位置、技术路线、客户和量产窗口。
- `timelineEvents`：可被变化时间线展示的事件。报告本身也应该至少输出一条事件。

`extracted.schema.json` 是当前结构的约束文档。后续新增报告时，优先按这个 schema 写。

## 图谱信号规则

连接线默认读取 `graphSignals` 中指向边的 YoY 增长信号。图谱的日期选择器使用“真实状态回填”口径：按 `periodStart` / `periodEnd` 判断报告信号覆盖哪个经营周期，而不是按 `publishedAt` 判断当时是否已经披露。

选择某个观察日期时：

- 优先使用 `periodStart <= 观察日期 <= periodEnd` 的报告信号。
- 同时有季度、半年报、年报覆盖该日期时，优先使用覆盖周期更短的信号。
- 如果没有报告覆盖该日期，则使用观察日期之前最近结束的报告周期。
- `publishedAt` 仍用于来源追溯和时间线，不用于限制历史真实状态回填。

支持的边增长 metric：

- `revenue_growth_yoy_proxy`：用报告收入增长合理代理该边交易增长。
- `demand_growth_signal`：对相关链路的低置信度需求读穿。

示例：

```json
{
  "target": {
    "type": "edge",
    "source": "pluggable_optical_module",
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

时间线不再读取独立的 `events.json`。所有事件都来自报告包的 `timelineEvents`。

示例：

```json
{
  "id": "innolight-2026q1-report-published",
  "date": "2026-04-17",
  "type": "financial_report",
  "title": "中际旭创发布 2026 年一季度报告",
  "summary": "营业收入同比 +192.1%，归母净利润同比 +262.3%。",
    "relatedNodeIds": ["pluggable_optical_module", "data_center_switch"],
  "relatedCompanyIds": ["zhongji_innolight"],
  "sourceReportId": "2026-04-17_zhongji-innolight_2026q1"
}
```

## 标的观察表规则

标的观察表不直接展示 `taxonomy/companies.json` 的全量公司清单。`taxonomy/companies.json` 只保留公司身份和底图关联；观察表展示数据来自报告包的 `companySignals`。

示例：

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
    "relatedNodeIds": ["pluggable_optical_module", "data_center_switch", "ai_server"]
  },
  "estimated": true,
  "confidence": 0.76,
  "method": "primary_business_and_industry_mapping"
}
```

如果同一家公司有多个报告信号，前端默认展示置信度最高、报告期较新的记录。

## 约定

- JSON 只放结构化数据，不放长篇解读。
- 解释、假设、局限性放到 `note.md`。
- PDF 不提交到 Git，只保留官方 URL 和本地忽略路径。
- 估算值写 `estimated: true`。
- `confidence` 使用 `0` 到 `1`。
- 同一节点/边出现多个信号时，前端默认展示最新且置信度最高的信号，详情页后续展示全部来源。
