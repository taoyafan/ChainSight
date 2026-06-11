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
          <n-h3 style="margin: 0;">产品增长输入</n-h3>
        </div>
        <n-data-table
          :columns="productColumns"
          :data="productRows"
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
        <n-data-table
          :columns="signalColumns"
          :data="signalRows"
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
  NPopover, NSpace, NTag, NText, NThing
} from 'naive-ui'
import { reportPackages } from '@/utils/reportRepository'
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

const graphSignalById = computed(() =>
  Object.fromEntries((reportPackage.value?.graphSignals || []).map((signal) => [signal.id, signal]))
)

const productRows = computed(() =>
  (reportPackage.value?.productGrowthInputs || []).map((item) => ({
    ...item,
    productLabel: nodeLabel(item.productNodeId),
    growthMetricLabel: metricMap.value[item.growthMetricId]?.displayLabel || METRIC_TEXT[item.growthMetricId] || item.growthMetricId,
    confidence: graphSignalById.value[item.id]?.confidence,
    confidenceFactors: graphSignalById.value[item.id]?.confidenceFactors,
  }))
)

const categoryRows = computed(() =>
  (reportPackage.value?.productCategoryMetrics || []).map((item) => ({
    ...item,
    mappedNodeLabels: (item.mappedNodeIds || []).map(nodeLabel).join(', '),
  }))
)

const signalRows = computed(() => {
  const pack = reportPackage.value
  if (!pack) return []

  const rows = (pack.graphSignals || []).map((signal) => ({
    ...signal,
    rowKey: signal.id,
    targetLabel: formatTarget(signal.target),
    targetTypeLabel: signal.target?.type === 'edge' ? '\u8fde\u7ebf' : '\u8282\u70b9',
    metricLabel: SIGNAL_METRIC_TEXT[signal.metric] || signal.metric,
  }))

  const existingNodeTargets = new Set(
    rows
      .filter((row) => row.target?.type === 'node')
      .map((row) => row.target.id)
  )

  for (const item of pack.companyProductCoverage || []) {
    if (!item.productNodeId || existingNodeTargets.has(item.productNodeId)) continue
    rows.push({
      rowKey: 'coverage-' + item.companyId + '-' + item.productNodeId,
      target: { type: 'node', id: item.productNodeId },
      targetLabel: nodeLabel(item.productNodeId),
      targetTypeLabel: '\u8282\u70b9',
      metricLabel: '\u4ea7\u54c1\u8986\u76d6',
      value: null,
      unit: '',
      period: report.value.period,
      confidence: null,
      supportingContext: [{ value: item.evidenceText || item.notes || '', unit: 'text' }],
    })
    existingNodeTargets.add(item.productNodeId)
  }

  for (const item of pack.productCategoryMetrics || []) {
    for (const nodeId of item.mappedNodeIds || []) {
      if (!nodeId || existingNodeTargets.has(nodeId)) continue
      rows.push({
        rowKey: 'category-' + item.id + '-' + nodeId,
        target: { type: 'node', id: nodeId },
        targetLabel: nodeLabel(nodeId),
        targetTypeLabel: '\u8282\u70b9',
        metricLabel: '\u4ea7\u54c1\u5927\u7c7b\u6620\u5c04',
        value: item.revenue,
        unit: item.unit,
        period: item.period || report.value.period,
        confidence: null,
        supportingContext: [{ value: item.sourceText || item.notes || '', unit: 'text' }],
      })
      existingNodeTargets.add(nodeId)
    }
  }

  return rows
})


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


const productColumns = [
  { title: '产品/节点', key: 'productLabel', width: 160 },
  { title: '增长口径', key: 'growthMetricLabel', width: 130 },
  {
    title: '增长值',
    key: 'growthValue',
    width: 100,
    render(row) {
      return formatTypedValue(row.growthValue, row.growthValueType)
    },
  },
  {
    title: '收入范围',
    key: 'scopeLabel',
    width: 150,
    render(row) {
      return row.scopeLabel || row.revenueScope || '-'
    },
  },
  {
    title: '占比档位',
    key: 'shareOfScope',
    width: 140,
    render(row) {
      return h('span', { class: 'compact-text' }, SHARE_SHORT_TEXT[row.shareOfScope] || row.shareOfScope || '-')
    },
  },
  {
    title: '归因',
    key: 'managementAttribution',
    width: 120,
    render(row) {
      return h('span', { class: 'compact-text' }, ATTRIBUTION_SHORT_TEXT[row.managementAttribution] || row.managementAttribution || '-')
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
    width: 230,
    render(row) {
      const parts = evidenceParts(row)
      if (!parts.length) return '-'

      return h('div', { class: 'evidence-brief' }, [
        h('span', { class: 'evidence-summary' }, compactText(parts[0], 42)),
        h(NPopover, { trigger: 'click', placement: 'left', width: 560 }, {
          trigger: () => h(NButton, { text: true, type: 'primary', size: 'tiny' }, () => '详情'),
          default: () => h('div', { class: 'evidence-popover' }, [
            h('p', [
              h('strong', '占比档位：'),
              row.confidenceFactors?.shareOfScope?.label || SHARE_TEXT[row.shareOfScope] || row.shareOfScope || '-',
            ]),
            h('p', [
              h('strong', '归因：'),
              row.confidenceFactors?.managementAttribution?.label || ATTRIBUTION_TEXT[row.managementAttribution] || row.managementAttribution || '-',
            ]),
            ...parts.map((part) => h('p', part)),
          ]),
        }),
      ])
    },
  },
]

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

const signalColumns = [
  { title: '\u7c7b\u578b', key: 'targetTypeLabel', width: 80 },
  { title: '\u76ee\u6807', key: 'targetLabel', width: 240 },
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

const SHARE_TEXT = {
  high_over_80: 'A 在分类中占比极高（>80%）',
  medium_30_80_or_unknown: 'A 在分类中占比中等（30%-80%）或占比不详',
  low_under_30_or_mixed: 'A 在分类中占比低（<30%）或分类包含多项无关业务',
}

const SHARE_SHORT_TEXT = {
  high_over_80: '>80%',
  medium_30_80_or_unknown: '30%-80% / 不详',
  low_under_30_or_mixed: '<30% / 混合',
}

const ATTRIBUTION_TEXT = {
  core_driver: '明确点名 A 是主要/核心驱动',
  mentioned_contributor: '笼统提及 A 有贡献',
  not_mentioned: '未提及 A',
}

const ATTRIBUTION_SHORT_TEXT = {
  core_driver: '核心驱动',
  mentioned_contributor: '有贡献',
  not_mentioned: '未提及',
}


function nodeLabel(nodeId) {
  return graphStore.nodeMap[nodeId]?.label || nodeId || '-'
}

function formatTarget(target = {}) {
  if (target.type === 'edge') return `${nodeLabel(target.source)} -> ${nodeLabel(target.target)}`
  if (target.type === 'node') return nodeLabel(target.id)
  return target.id || target.type || '-'
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
    row.attributionEvidenceText,
    row.shareOfScopeEvidenceText,
    row.notes,
  ].filter(Boolean)
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
