<template>
  <div class="node-analysis-page">
    <n-button text type="primary" class="back-button" @click="router.push({ name: 'topology' })">
      返回拓扑
    </n-button>

    <section class="hero-band">
      <div>
        <n-h2 style="margin: 0;">{{ node?.label || '节点分析' }}</n-h2>
        <n-space align="center" size="small" style="margin-top: 8px;">
          <n-tag :type="statusType" size="small">{{ STATUS_TEXT[node?.status] || node?.status || '—' }}</n-tag>
          <n-tag v-if="node?.bottleneck" type="warning" size="small">潜在瓶颈</n-tag>
          <n-text depth="3">{{ LAYER_TEXT[node?.layer] || node?.layer }}</n-text>
        </n-space>
      </div>
      <div class="hero-metric">
        <n-text depth="3">已覆盖公司</n-text>
        <strong>{{ watchRows.length }}</strong>
      </div>
    </section>

    <section class="content-grid">
      <div class="panel chart-panel">
        <div class="panel-heading">
          <div>
            <n-h3 style="margin: 0;">收入 proxy 份额</n-h3>
            <n-text depth="3">
              统一折算为 CNY，USD/CNY={{ FX_RATES_TO_CNY.USD }}，汇率日期 {{ FX_RATE_UPDATED_AT }}
            </n-text>
          </div>
          <n-tag size="small" :bordered="false">最新报告</n-tag>
        </div>

        <div v-if="revenueItems.length" class="chart-layout">
          <svg class="pie" viewBox="0 0 220 220" role="img" aria-label="收入 proxy 份额饼图">
            <circle cx="110" cy="110" r="76" fill="none" stroke="rgba(148, 163, 184, .18)" stroke-width="34" />
            <circle
              v-for="segment in pieSegments"
              :key="segment.companyId"
              cx="110"
              cy="110"
              r="76"
              fill="none"
              :stroke="segment.color"
              stroke-width="34"
              :stroke-dasharray="`${segment.length} ${circumference - segment.length}`"
              :stroke-dashoffset="segment.offset"
              transform="rotate(-90 110 110)"
            />
            <text x="110" y="104" text-anchor="middle" class="pie-total">{{ formatCny(totalCny) }}</text>
            <text x="110" y="126" text-anchor="middle" class="pie-subtitle">CNY proxy</text>
          </svg>

          <div class="legend-list">
            <div v-for="segment in pieSegments" :key="segment.companyId" class="legend-row">
              <span class="legend-dot" :style="{ background: segment.color }" />
              <div class="legend-main">
                <span>{{ segment.company.name }}</span>
                <n-text depth="3">{{ segment.report.period }} · {{ formatPercent(segment.share) }}</n-text>
              </div>
              <strong>{{ formatCny(segment.convertedValueCny) }}</strong>
            </div>
          </div>
        </div>
        <n-empty v-else description="暂无可估算收入 proxy" />
      </div>

      <div class="panel">
        <n-h3 style="margin-top: 0;">观察表覆盖公司</n-h3>
        <n-list v-if="watchRows.length" bordered>
          <n-list-item v-for="company in watchRows" :key="company.id">
            <n-thing>
              <template #header>
                <n-button text type="primary" @click="router.push({ name: 'watchlist', query: { company: company.id } })">
                  {{ company.name }}
                </n-button>
                <n-text depth="3" style="margin-left: 8px;">{{ company.ticker }}</n-text>
              </template>
              <template #description>
                <n-space size="small">
                  <n-tag size="tiny" :type="stageTagType(company.stage)">
                    {{ STATUS_TEXT[company.stage] || company.stage }}
                  </n-tag>
                  <n-text depth="3">{{ company.techRoute }}</n-text>
                </n-space>
              </template>
            </n-thing>
          </n-list-item>
        </n-list>
        <n-empty v-else description="标的观察表暂无覆盖公司" />
      </div>
    </section>

    <section class="panel detail-panel">
      <div class="panel-heading">
        <n-h3 style="margin: 0;">收入 proxy 明细</n-h3>
        <n-text depth="3">份额仅基于当前观察表覆盖且有收入 proxy 的公司估算</n-text>
      </div>
      <n-data-table
        :columns="columns"
        :data="revenueItems"
        :pagination="false"
        :bordered="true"
        striped
        size="small"
      />
    </section>
  </div>
</template>

<script setup>
import { computed, h } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NButton, NDataTable, NEmpty, NH2, NH3, NList, NListItem,
  NSpace, NTag, NText, NThing
} from 'naive-ui'
import { useGraphStore } from '@/stores/graphStore'
import { LAYER_TEXT, STATUS_TEXT } from '@/utils/helpers'
import {
  FX_RATES_TO_CNY,
  FX_RATE_UPDATED_AT,
  getNodeRevenueProxyItems,
  getNodeWatchRows,
} from '@/utils/reportRepository'

const route = useRoute()
const router = useRouter()
const graphStore = useGraphStore()

const nodeId = computed(() => String(route.params.nodeId || ''))
const node = computed(() => graphStore.nodeMap[nodeId.value] || null)
const watchRows = computed(() => getNodeWatchRows(nodeId.value))
const revenueItems = computed(() => getNodeRevenueProxyItems(nodeId.value))

const totalCny = computed(() =>
  revenueItems.value.reduce((sum, item) => sum + item.convertedValueCny, 0)
)

const statusType = computed(() => {
  const map = { RnD: 'default', sampling: 'warning', mass_prod: 'success' }
  return map[node.value?.status] || 'default'
})

const colors = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#7c3aed', '#0891b2', '#db2777']
const circumference = 2 * Math.PI * 76

const pieSegments = computed(() => {
  let offset = 0
  return revenueItems.value.map((item, index) => {
    const length = item.share * circumference
    const segment = {
      ...item,
      color: colors[index % colors.length],
      length,
      offset: -offset,
    }
    offset += length
    return segment
  })
})

const columns = [
  {
    title: '公司',
    key: 'company',
    width: 180,
    render(row) {
      return h(NButton, {
        text: true,
        type: 'primary',
        onClick: () => router.push({ name: 'watchlist', query: { company: row.companyId } }),
      }, () => row.company.name)
    },
  },
  {
    title: '收入 proxy',
    key: 'value',
    width: 150,
    render(row) {
      return `${formatMoney(row.value, row.unit)}`
    },
  },
  {
    title: '折算 CNY',
    key: 'convertedValueCny',
    width: 150,
    render(row) {
      return formatCny(row.convertedValueCny)
    },
  },
  {
    title: '份额',
    key: 'share',
    width: 90,
    render(row) {
      return formatPercent(row.share)
    },
  },
  {
    title: '报告期',
    key: 'period',
    width: 90,
    render(row) {
      return row.signal.period || row.report.period || '—'
    },
  },
  {
    title: '置信度',
    key: 'confidence',
    width: 90,
    render(row) {
      return formatPercent(row.signal.confidence)
    },
  },
  {
    title: '估算方法',
    key: 'method',
    render(row) {
      return row.signal.method || '—'
    },
  },
]

function stageTagType(stage) {
  const map = { RnD: 'default', sampling: 'warning', mass_prod: 'success' }
  return map[stage] || 'default'
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return '—'
  return `${(value * 100).toFixed(value >= 0.1 ? 0 : 1)}%`
}

function formatMoney(value, unit) {
  if (!Number.isFinite(value)) return '—'
  const abs = Math.abs(value)
  if (abs >= 1e8) return `${(value / 1e8).toFixed(2)}亿 ${unit}`
  if (abs >= 1e6) return `${(value / 1e6).toFixed(2)}百万 ${unit}`
  return `${value.toLocaleString('zh-CN', { maximumFractionDigits: 0 })} ${unit}`
}

function formatCny(value) {
  return formatMoney(value, 'CNY')
}
</script>

<style scoped>
.node-analysis-page {
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

.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(300px, .8fr);
  gap: 18px;
  margin-top: 18px;
}

.panel {
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

.chart-layout {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  gap: 18px;
  align-items: center;
}

.pie {
  width: 100%;
  max-width: 260px;
  aspect-ratio: 1;
}

.pie-total {
  fill: currentColor;
  font-size: 16px;
  font-weight: 700;
}

.pie-subtitle {
  fill: currentColor;
  font-size: 11px;
  opacity: .62;
}

.legend-list {
  display: grid;
  gap: 12px;
}

.legend-row {
  display: grid;
  grid-template-columns: 12px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.legend-main {
  min-width: 0;
  display: grid;
  gap: 2px;
}

.legend-main span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-panel {
  margin-top: 18px;
}

@media (max-width: 900px) {
  .content-grid,
  .chart-layout {
    grid-template-columns: 1fr;
  }

  .hero-band {
    align-items: flex-start;
    flex-direction: column;
  }

  .hero-metric {
    text-align: left;
  }
}
</style>
