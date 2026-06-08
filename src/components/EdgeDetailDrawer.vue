<template>
  <n-drawer v-model:show="visible" :width="460" placement="right">
    <n-drawer-content :title="edge?.label || '链路详情'" closable>
      <template v-if="edge">
        <n-descriptions :column="1" label-placement="left" bordered size="small">
          <n-descriptions-item label="链路">
            {{ sourceLabel }} → {{ targetLabel }}
          </n-descriptions-item>
          <n-descriptions-item label="当前 YoY">
            <n-text :type="growthTextType">{{ formatYoy(primarySignal?.signal?.value) }}</n-text>
          </n-descriptions-item>
          <n-descriptions-item label="报告期">
            {{ primarySignal?.signal?.period || '—' }}
          </n-descriptions-item>
          <n-descriptions-item label="置信度">
            {{ formatPercent(primarySignal?.signal?.confidence) }}
          </n-descriptions-item>
        </n-descriptions>

        <n-alert type="info" title="口径说明" style="margin-top: 16px;">
          线宽和颜色优先使用观察日期对应经营周期内的报告信号；没有覆盖时使用最近已结束经营周期的信号。
        </n-alert>

        <n-h4 style="margin-top: 20px;">报告贡献</n-h4>
        <n-list v-if="signals.length" bordered>
          <n-list-item v-for="item in signals" :key="item.signal.id">
            <n-thing>
              <template #header>
                <n-space align="center" size="small">
                  <n-text strong>{{ item.report.companyName || '未知公司' }}</n-text>
                  <n-tag size="tiny" :type="growthTagType(item.signal.value)">
                    {{ formatYoy(item.signal.value) }}
                  </n-tag>
                </n-space>
              </template>
              <template #description>
                <n-space vertical size="small">
                  <n-text depth="3">
                    {{ item.signal.period || item.report.period || '—' }} ·
                    置信度 {{ formatPercent(item.signal.confidence) }}
                  </n-text>
                  <n-text depth="3">{{ item.report.title || item.report.id }}</n-text>
                  <n-text depth="3">方法：{{ item.signal.method || '—' }}</n-text>
                </n-space>
              </template>
            </n-thing>
          </n-list-item>
        </n-list>
        <n-empty v-else size="small" description="暂无报告 YoY 贡献" />
      </template>
    </n-drawer-content>
  </n-drawer>
</template>

<script setup>
import { computed } from 'vue'
import {
  NAlert, NDescriptions, NDescriptionsItem, NDrawer, NDrawerContent,
  NEmpty, NH4, NList, NListItem, NSpace, NTag, NText, NThing
} from 'naive-ui'
import { getBestEdgeGrowthAsOf, getEdgeGrowthSignalsAsOf } from '@/utils/reportRepository'

const props = defineProps({
  edge: { type: Object, default: null },
  nodeMap: { type: Object, default: () => ({}) },
  analysisDate: { type: String, default: '' },
})

const visible = defineModel('show', { type: Boolean, default: false })

const sourceLabel = computed(() => props.nodeMap[props.edge?.source]?.label || props.edge?.source || '—')
const targetLabel = computed(() => props.nodeMap[props.edge?.target]?.label || props.edge?.target || '—')

const primarySignal = computed(() => {
  if (!props.edge) return null
  return getBestEdgeGrowthAsOf(props.edge.source, props.edge.target, props.analysisDate)
})

const signals = computed(() => {
  if (!props.edge) return []
  return getEdgeGrowthSignalsAsOf(props.edge.source, props.edge.target, props.analysisDate)
})

const growthTextType = computed(() => {
  const value = primarySignal.value?.signal?.value
  if (!Number.isFinite(value)) return 'default'
  return value >= 0 ? 'success' : 'error'
})

function formatYoy(value) {
  if (!Number.isFinite(value)) return '暂无 YoY 数据'
  const sign = value > 0 ? '+' : ''
  return `${sign}${(value * 100).toFixed(1)}%`
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return '—'
  return `${(value * 100).toFixed(0)}%`
}

function growthTagType(value) {
  if (!Number.isFinite(value)) return 'default'
  if (value > 0.02) return 'success'
  if (value < -0.02) return 'error'
  return 'default'
}
</script>
