<template>
  <div class="report-detail-page">
    <n-button text type="primary" class="back-button" @click="router.push({ name: 'timeline' })">
      返回时间线
    </n-button>

    <n-empty v-if="!reportPackage" description="未找到报告" />

    <template v-else>
      <section class="hero-band">
        <div class="hero-main">
          <n-h2 style="margin: 0;">{{ report.companyName || report.companyId }}</n-h2>
          <n-text class="report-title">{{ report.title || report.id }}</n-text>
          <n-space align="center" size="small" style="margin-top: 10px;">
            <n-tag size="small" type="info">{{ report.period || '未标注期间' }}</n-tag>
            <n-tag size="small">{{ reportTypeText }}</n-tag>
            <n-text depth="3">发布日期 {{ report.publishedAt || '-' }}</n-text>
          </n-space>
        </div>
        <div class="hero-metric">
          <n-text depth="3">提取指标</n-text>
          <strong>{{ reportPackage.metrics.length }}</strong>
        </div>
      </section>

      <section class="panel">
        <div class="panel-heading">
          <n-h3 style="margin: 0;">关键财务指标</n-h3>
        </div>
        <n-data-table
          :columns="metricColumns"
          :data="metricRows"
          :pagination="false"
          :bordered="true"
          striped
          size="small"
        />
      </section>

      <section v-if="categoryRows.length" class="panel">
        <div class="panel-heading">
          <n-h3 style="margin: 0;">披露产品大类数据</n-h3>
        </div>
        <n-data-table
          :columns="categoryColumns"
          :data="categoryRows"
          :pagination="false"
          :bordered="true"
          striped
          size="small"
        />
      </section>

      <section class="panel">
        <div class="panel-heading">
          <n-h3 style="margin: 0;">图谱信号</n-h3>
        </div>
        <n-h4 class="signal-section-title">产品节点</n-h4>
        <n-data-table
          :columns="nodeSignalColumns"
          :data="productNodeRows"
          :pagination="false"
          :bordered="true"
          striped
          size="small"
        />
        <n-h4 class="signal-section-title">下游节点</n-h4>
        <n-data-table
          :columns="downstreamSignalColumns"
          :data="downstreamSignalRows"
          :pagination="false"
          :bordered="true"
          striped
          size="small"
        />
        <n-h4 class="signal-section-title">边</n-h4>
        <n-data-table
          :columns="edgeSignalColumns"
          :data="edgeSignalRows"
          :pagination="false"
          :bordered="true"
          striped
          size="small"
        />
      </section>

      <section v-if="qualitativeSignalRows.length" class="panel">
        <div class="panel-heading">
          <n-h3 style="margin: 0;">文字信号</n-h3>
        </div>
        <n-data-table
          :columns="qualitativeSignalColumns"
          :data="qualitativeSignalRows"
          :pagination="false"
          :bordered="true"
          striped
          size="small"
        />
      </section>

      <section class="content-grid">
        <div class="panel">
          <n-h3 style="margin-top: 0;">证据与限制</n-h3>
          <n-space vertical size="medium">
            <div v-if="notes.summary">
              <n-text strong>摘要</n-text>
              <p>{{ notes.summary }}</p>
            </div>
            <div v-if="notes.mappingAssumptions?.length">
              <n-text strong>映射假设</n-text>
              <ul>
                <li v-for="item in notes.mappingAssumptions" :key="item">{{ item }}</li>
              </ul>
            </div>
            <div v-if="notes.limitations?.length">
              <n-text strong>限制</n-text>
              <ul>
                <li v-for="item in notes.limitations" :key="item">{{ item }}</li>
              </ul>
            </div>
            <n-empty
              v-if="!notes.summary && !notes.mappingAssumptions?.length && !notes.limitations?.length"
              size="small"
              description="暂无 notes"
            />
          </n-space>
        </div>

        <div class="panel">
          <n-h3 style="margin-top: 0;">来源</n-h3>
          <n-list v-if="report.sources?.length" bordered>
            <n-list-item v-for="source in report.sources" :key="source.name || source.url || source.type">
              <n-thing>
                <template #header>
                  <a v-if="source.url" :href="source.url" target="_blank" rel="noreferrer">
                    {{ source.name || source.publisher || source.type }}
                  </a>
                  <span v-else>{{ source.name || source.publisher || source.type }}</span>
                </template>
                <template #description>
                  <n-space vertical size="small">
                    <n-text depth="3">{{ source.publisher || source.type || '-' }}</n-text>
                    <n-text v-if="source.accessedAt" depth="3">访问日期 {{ source.accessedAt }}</n-text>
                  </n-space>
                </template>
              </n-thing>
            </n-list-item>
          </n-list>
          <n-empty v-else size="small" description="暂无来源记录" />
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import { computed, h } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NButton, NDataTable, NEmpty, NH2, NH3, NList, NListItem,
  NH4, NPopover, NSpace, NTag, NText, NThing
} from 'naive-ui'
import { reportPackages } from '@/utils/reportRepository'
import {
  QUALITATIVE_SIGNAL_TEXT,
  QUALITATIVE_STRENGTH_TEXT,
  QUALITATIVE_TIME_HORIZON_TEXT,
  isConstraintSignal,
  qualitativeSignalTone,
} from '@/utils/qualitativeSignals'
import { useGraphStore } from '@/stores/graphStore'

const route = useRoute()
const router = useRouter()
const graphStore = useGraphStore()

const reportPackage = computed(() =>
  reportPackages.find((item) => item.report.id === String(route.params.reportId || ''))
)

const report = computed(() => reportPackage.value?.report || {})
const notes = computed(() => reportPackage.value?.notes || {})

const reportTypeText = computed(() => {
  const map = {
    quarterly_report: '季度报告',
    annual_report: '年度报告',
    earnings_release: '业绩公告',
  }
  return map[report.value.type] || report.value.type || '报告'
})

const metricRows = computed(() =>
  (reportPackage.value?.metrics || []).map((metric) => ({
    ...metric,
    displayLabel: METRIC_TEXT[metric.id] || metric.label || metric.id,
  }))
)

const metricMap = computed(() =>
  Object.fromEntries(metricRows.value.map((metric) => [metric.id, metric]))
)

const categoryRows = computed(() =>
  (reportPackage.value?.productCategoryMetrics || []).map((item) => ({
    ...item,
    mappedNodeLabels: (item.mappedNodeIds || []).map(nodeLabel).join(', '),
  }))
)

const productNodeRows = computed(() =>
  (reportPackage.value?.mapping?.productNodes || []).map((product) => {
    const signal = (reportPackage.value?.mapping?.productNodeSignals || [])
      .find((item) => item.target?.type === 'node' && item.target.id === product.nodeId)
    const financial = product.financial || {}
    const coverage = product.coverage || {}
    return {
      rowKey: `product-${product.nodeId}`,
      nodeId: product.nodeId,
      productLabel: nodeLabel(product.nodeId),
      commercializationType: coverage.commercializationType,
      metricLabel: financial.growthMetricId
        ? metricMap.value[financial.growthMetricId]?.displayLabel || METRIC_TEXT[financial.growthMetricId] || financial.growthMetricId
        : '产品覆盖',
      value: financial.growthValue,
      unit: financial.growthValueType,
      period: financial.period || report.value.period,
      confidence: signal?.confidence,
      shareOfScope: financial.shareOfScope,
      managementAttribution: financial.managementAttribution,
      confidenceFactors: signal?.confidenceFactors || {},
      evidenceText: coverage.evidenceText,
      attributionEvidenceText: financial.attributionEvidenceText,
      notes: financial.notes || coverage.notes,
    }
  })
)

const downstreamSignalRows = computed(() =>
  (reportPackage.value?.mapping?.downstreamSignals || []).map((signal, index) => ({
    ...signal,
    rowKey: `downstream-${signal.sourceProductNodeId || 'any'}-${signal.downstreamNodeId || index}`,
    sourceProductLabel: signal.sourceProductNodeId ? nodeLabel(signal.sourceProductNodeId) : '未指定产品',
    downstreamLabel: nodeLabel(signal.downstreamNodeId),
    confidenceFactors: signal.confidenceFactors || {},
    supportingContext: signal.supportingContext || [],
  }))
)

const edgeSignalRows = computed(() =>
  (reportPackage.value?.graphSignals || [])
    .filter((signal) => signal.target?.type === 'edge')
    .map(toSignalRow)
)

const qualitativeSignalRows = computed(() =>
  (reportPackage.value?.qualitativeSignals || []).map((signal) => ({
    ...signal,
    rowKey: signal.id,
    signalTypeLabel: QUALITATIVE_SIGNAL_TEXT[signal.signalType] || signal.signalType,
    directionLabel: qualitativeSignalTone(signal).text,
    strengthLabel: QUALITATIVE_STRENGTH_TEXT[signal.strength] || signal.strength || '-',
    timeHorizonLabel: QUALITATIVE_TIME_HORIZON_TEXT[signal.timeHorizon] || signal.timeHorizon || '-',
    targetLabels: (signal.targets || []).map(formatQualitativeTarget).join(', '),
    isConstraint: isConstraintSignal(signal),
  }))
)


const metricColumns = [
  { title: '类别', key: 'displayLabel', width: 220 },
  {
    title: '数值',
    key: 'value',
    width: 160,
    render(row) {
      return formatMetricValue(row.value, row.unit)
    },
  },
  {
    title: 'YoY',
    key: 'yoy',
    width: 110,
    render(row) {
      return formatYoy(row.yoy)
    },
  },
  {
    title: '期间',
    key: 'period',
    width: 100,
    render(row) {
      return row.period || report.value.period || '-'
    },
  },
]


const productNodeColumns = [
  { title: '产品节点', key: 'productLabel', width: 190 },
  { title: '指标', key: 'metricLabel', width: 150 },
  {
    title: '值',
    key: 'value',
    width: 110,
    render(row) {
      return formatTypedValue(row.value, row.unit)
    },
  },
  {
    title: '商业化',
    key: 'commercializationType',
    width: 120,
    render(row) {
      return COMMERCIALIZATION_TEXT[row.commercializationType] || row.commercializationType || '-'
    },
  },
  {
    title: '占比档位',
    key: 'shareOfScope',
    width: 140,
    render(row) {
      const factor = row.confidenceFactors?.shareOfScope
      return h('span', { class: 'compact-text' }, SHARE_SHORT_TEXT[factor?.key] || SHARE_SHORT_TEXT[row.shareOfScope] || row.shareOfScope || '-')
    },
  },
  {
    title: '归因',
    key: 'managementAttribution',
    width: 120,
    render(row) {
      const factor = row.confidenceFactors?.managementAttribution
      return h('span', { class: 'compact-text' }, ATTRIBUTION_SHORT_TEXT[factor?.key] || ATTRIBUTION_SHORT_TEXT[row.managementAttribution] || row.managementAttribution || '-')
    },
  },
  {
    title: '置信度',
    key: 'confidence',
    width: 90,
    render(row) {
      return formatPercent(row.confidence)
    },
  },
  {
    title: '证据/备注',
    key: 'notes',
    render(row) {
      return renderEvidenceCell(evidenceParts(row))
    },
  },
]

const nodeSignalColumns = productNodeColumns

const categoryColumns = [
  { title: '产品大类', key: 'categoryName', width: 180 },
  {
    title: '收入',
    key: 'revenue',
    width: 140,
    render(row) {
      return formatMetricValue(row.revenue, row.unit)
    },
  },
  {
    title: '营业成本',
    key: 'operatingCost',
    width: 140,
    render(row) {
      return formatMetricValue(row.operatingCost, row.unit)
    },
  },
  {
    title: '毛利',
    key: 'grossProfit',
    width: 140,
    render(row) {
      return formatMetricValue(row.grossProfit, row.unit)
    },
  },
  {
    title: '毛利率',
    key: 'grossMargin',
    width: 100,
    render(row) {
      return formatPercent(row.grossMargin)
    },
  },
  {
    title: '收入 YoY',
    key: 'revenueYoy',
    width: 100,
    render(row) {
      return formatYoy(row.revenueYoy)
    },
  },
  { title: '映射节点', key: 'mappedNodeLabels', width: 180 },
  {
    title: '来源',
    key: 'sourceText',
    render(row) {
      return row.sourceText || row.sourceSection || row.notes || '-'
    },
  },
]

const edgeSignalColumns = [
  { title: '\u8fb9', key: 'targetLabel', width: 280 },
  { title: '\u6307\u6807', key: 'metricLabel', width: 170 },
  {
    title: '\u503c',
    key: 'value',
    width: 120,
    render(row) {
      return formatTypedValue(row.value, row.unit)
    },
  },
  {
    title: '\u671f\u95f4',
    key: 'period',
    width: 100,
    render(row) {
      return row.period || report.value.period || '-'
    },
  },
  {
    title: '\u7f6e\u4fe1\u5ea6',
    key: 'confidence',
    width: 90,
    render(row) {
      return formatPercent(row.confidence)
    },
  },
]

const downstreamSignalColumns = [
  { title: '\u4e0b\u6e38\u8282\u70b9', key: 'downstreamLabel', width: 190 },
  { title: '\u6765\u6e90\u4ea7\u54c1', key: 'sourceProductLabel', width: 190 },
  {
    title: '\u5360\u6bd4\u6863\u4f4d',
    key: 'shareOfScope',
    width: 140,
    render(row) {
      const factor = row.confidenceFactors?.shareOfScope
      return h('span', { class: 'compact-text' }, SHARE_SHORT_TEXT[factor?.key] || factor?.key || '-')
    },
  },
  {
    title: '\u5f52\u56e0',
    key: 'managementAttribution',
    width: 120,
    render(row) {
      const factor = row.confidenceFactors?.managementAttribution
      return h('span', { class: 'compact-text' }, ATTRIBUTION_SHORT_TEXT[factor?.key] || factor?.key || '-')
    },
  },
  {
    title: '\u7f6e\u4fe1\u5ea6',
    key: 'confidence',
    width: 90,
    render(row) {
      return formatPercent(row.confidence)
    },
  },
  {
    title: '\u8bc1\u636e',
    key: 'supportingContext',
    render(row) {
      const parts = (row.supportingContext || []).map((item) => item.value).filter(Boolean)
      return renderEvidenceCell(parts)
    },
  },
]

const qualitativeSignalColumns = [
  {
    title: '方向',
    key: 'directionLabel',
    width: 120,
    render(row) {
      const tone = qualitativeSignalTone(row)
      return h(NTag, { size: 'small', type: tone.tagType }, () => row.directionLabel)
    },
  },
  {
    title: '事件',
    key: 'signalTypeLabel',
    width: 150,
    render(row) {
      const tone = qualitativeSignalTone(row)
      return h(NTag, {
        size: 'small',
        color: { color: tone.color, textColor: '#fff', borderColor: tone.color },
      }, () => row.signalTypeLabel)
    },
  },
  {
    title: '强度/时间',
    key: 'strengthLabel',
    width: 150,
    render(row) {
      return `${row.strengthLabel} · ${row.timeHorizonLabel}`
    },
  },
  { title: '关联对象', key: 'targetLabels', width: 260 },
  {
    title: '证据',
    key: 'evidenceText',
    render(row) {
      const parts = [
        row.evidenceText,
        row.isConstraint ? '产能/供应瓶颈按绿色处理：代表需求强，但兑现受供给约束。' : '',
        row.notes,
      ].filter(Boolean)
      return renderEvidenceCell(parts)
    },
  },
]

const METRIC_TEXT = {
  revenue: '营业收入',
  operating_cost: '营业成本',
  cost_of_revenue: '营业成本',
  gross_profit: '毛利',
  gross_margin: '毛利率',
  net_income: '净利润',
  net_loss: '净亏损',
  net_profit_attributable: '归母净利润',
  net_profit_attributable_ex_nonrecurring: '扣非归母净利润',
  profit_total: '利润总额',
  net_operating_cash_flow: '经营现金流净额',
  rd_expense: '研发投入',
  rd_expense_ratio: '研发费用率',
}

const SIGNAL_METRIC_TEXT = {
  revenue_proxy: '收入 proxy',
  gross_margin_proxy: '毛利率 proxy',
  revenue_growth_yoy_proxy: '收入 YoY proxy',
  demand_growth_signal: '需求增长信号',
  demand_context_signal: '需求背景信号',
}

const SHARE_SHORT_TEXT = {
  high_over_80: '>80%',
  medium_30_80_or_unknown: '30%-80% / 不详',
  low_under_30_or_mixed: '<30% / 混合',
}

const ATTRIBUTION_SHORT_TEXT = {
  core_driver: '核心驱动',
  mentioned_contributor: '有贡献',
  not_mentioned: '未提及',
}

const COMMERCIALIZATION_TEXT = {
  external_sales: '对外销售',
  internal_use_only: '内部自用',
  r_and_d_or_sampling: '研发/送样',
  not_revenue_product: '非收入产品',
}


function nodeLabel(nodeId) {
  return graphStore.nodeMap[nodeId]?.label || nodeId || '-'
}

function formatTarget(target = {}) {
  if (target.type === 'edge') return `${nodeLabel(target.source)} -> ${nodeLabel(target.target)}`
  if (target.type === 'node') return nodeLabel(target.id)
  return target.id || target.type || '-'
}

function formatQualitativeTarget(target = {}) {
  if (target.type === 'edge') return `边: ${nodeLabel(target.source)} -> ${nodeLabel(target.target)}`
  if (target.type === 'node') return `节点: ${nodeLabel(target.id)}`
  if (target.type === 'company') return `公司: ${target.id}`
  return target.id || target.type || '-'
}

function toSignalRow(signal) {
  return {
    ...signal,
    rowKey: signal.id,
    targetLabel: formatTarget(signal.target),
    metricLabel: SIGNAL_METRIC_TEXT[signal.metric] || signal.metric,
  }
}

function formatTypedValue(value, unit) {
  if (unit === 'yoy_ratio') return formatYoy(value)
  return formatMetricValue(value, unit)
}

function formatMetricValue(value, unit) {
  if (!Number.isFinite(value)) return '-'
  if (unit === 'ratio') return formatPercent(value)
  if (unit === 'CNY' || unit === 'USD') return formatMoney(value, unit)
  return `${value.toLocaleString('zh-CN', { maximumFractionDigits: 2 })} ${unit || ''}`.trim()
}

function formatMoney(value, unit) {
  const abs = Math.abs(value)
  if (abs >= 1e8) return `${(value / 1e8).toFixed(2)}亿 ${unit}`
  if (abs >= 1e6) return `${(value / 1e6).toFixed(2)}百万 ${unit}`
  return `${value.toLocaleString('zh-CN', { maximumFractionDigits: 0 })} ${unit}`
}

function formatYoy(value) {
  if (!Number.isFinite(value)) return '-'
  const sign = value > 0 ? '+' : ''
  return `${sign}${(value * 100).toFixed(1)}%`
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return '-'
  return `${(value * 100).toFixed(0)}%`
}

function evidenceParts(row) {
  return [
    row.evidenceText,
    row.attributionEvidenceText,
    row.shareOfScopeEvidenceText,
    row.notes,
  ].filter(Boolean)
}

function renderEvidenceCell(parts) {
  if (!parts.length) return '-'

  return h('div', { class: 'evidence-brief' }, [
    h('span', { class: 'evidence-summary' }, compactText(parts[0], 42)),
    h(NPopover, { trigger: 'click', placement: 'left', width: 560 }, {
      trigger: () => h(NButton, { text: true, type: 'primary', size: 'tiny' }, () => '详情'),
      default: () => h('div', { class: 'evidence-popover' }, parts.map((part) => h('p', part))),
    }),
  ])
}

function compactText(value, maxLength) {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength)}...`
}
</script>

<style scoped>
.report-detail-page {
  min-height: 100%;
  padding: 18px 20px 28px;
  background: var(--n-color);
}

.back-button {
  margin-bottom: 12px;
}

.hero-band {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: center;
  padding: 18px 0 20px;
  border-bottom: 1px solid var(--n-border-color);
}

.hero-main {
  min-width: 0;
}

.report-title {
  display: block;
  margin-top: 6px;
  font-size: 16px;
}

.hero-metric {
  min-width: 120px;
  display: grid;
  gap: 4px;
  text-align: right;
}

.hero-metric strong {
  font-size: 34px;
  line-height: 1;
}

.panel {
  margin-top: 18px;
  padding: 18px;
  border: 1px solid var(--n-border-color);
  border-radius: 8px;
  background: var(--n-card-color);
}

.panel-heading {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 16px;
}

.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(300px, .8fr);
  gap: 18px;
}

.content-grid .panel {
  min-width: 0;
}

.signal-section-title {
  margin: 18px 0 10px;
}

.signal-section-title:first-of-type {
  margin-top: 0;
}

.compact-text {
  display: inline-block;
  max-width: 100%;
  white-space: nowrap;
}

.evidence-brief {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.evidence-summary {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.evidence-popover {
  display: grid;
  gap: 10px;
  line-height: 1.55;
  max-height: 360px;
  overflow: auto;
  white-space: normal;
}

.evidence-popover p,
.panel p {
  margin: 0;
}

ul {
  margin: 8px 0 0;
  padding-left: 18px;
}

a {
  color: var(--n-primary-color);
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

@media (max-width: 900px) {
  .hero-band,
  .panel-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .hero-metric {
    text-align: left;
  }

  .content-grid {
    grid-template-columns: 1fr;
  }
}
</style>
