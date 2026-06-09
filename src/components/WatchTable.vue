<template>
  <div class="watch-table">
    <!-- 筛选栏 -->
    <n-space align="center" style="margin-bottom: 16px;">
      <n-select
        v-model:value="filterLayer"
        :options="layerOptions"
        clearable
        placeholder="产业链层级"
        style="width: 150px;"
      />
      <n-button @click="handleExport" type="primary" secondary size="small">
        导出 CSV
      </n-button>
    </n-space>

    <!-- 表格 -->
    <n-data-table
      :columns="columns"
      :data="filteredData"
      :pagination="{ pageSize: 20 }"
      :bordered="true"
      striped
      size="small"
    />
  </div>
</template>

<script setup>
import { ref, computed, h } from 'vue'
import { NDataTable, NSpace, NSelect, NButton, useMessage } from 'naive-ui'
import { useCompanyStore } from '@/stores/companyStore'
import FeedbackButton from './FeedbackButton.vue'
import { LAYER_TEXT, exportCSV } from '@/utils/helpers'

const emit = defineEmits(['go-to-company'])

const companyStore = useCompanyStore()
const message = useMessage()

const filterLayer = ref(null)
const layerOptions = computed(() =>
  Object.entries(LAYER_TEXT).map(([v, l]) => ({ label: l, value: v }))
)

const filteredData = computed(() => {
  let list = companyStore.watchRows
  if (filterLayer.value) list = list.filter(c => c.layer === filterLayer.value)
  return list
})

const columns = [
  {
    title: '公司名称',
    key: 'name',
    width: 160,
    render(row) {
      return h(NButton, {
        text: true,
        type: 'primary',
        onClick: () => emit('go-to-company', row.id),
      }, () => `${row.name}`)
    },
  },
  {
    title: '代码',
    key: 'ticker',
    width: 100,
  },
  {
    title: '产业链位置',
    key: 'layer',
    width: 110,
    render(row) {
      return LAYER_TEXT[row.layer] || row.layer
    },
    filterOptions: Object.entries(LAYER_TEXT).map(([v, l]) => ({ label: l, value: v })),
  },
  {
    title: '技术路线',
    key: 'techRoute',
    width: 130,
  },
  {
    title: '主要客户',
    key: 'keyCustomers',
    width: 160,
    render(row) {
      return (row.keyCustomers || []).join(', ') || '—'
    },
  },
  {
    title: '报告期',
    key: 'period',
    width: 90,
  },
  {
    title: '置信度',
    key: 'confidence',
    width: 90,
    render(row) {
      if (!Number.isFinite(row.confidence)) return '—'
      return `${(row.confidence * 100).toFixed(0)}%`
    },
  },
  {
    title: '来源',
    key: 'sourceReportTitle',
    width: 180,
    render(row) {
      return row.sourceReportTitle ? `${row.sourceReportTitle}` : '—'
    },
  },
  {
    title: '操作',
    key: 'actions',
    width: 160,
    render(row) {
      return h(NSpace, { size: 'small' }, () => [
        h(NButton, {
          size: 'tiny',
          type: companyStore.isWatched(row.id) ? 'primary' : 'default',
          onClick: () => companyStore.toggleWatch(row.id),
        }, () => companyStore.isWatched(row.id) ? '已观察' : '加入观察'),
        h(FeedbackButton, { context: row.name }),
      ])
    },
  },
]

function handleExport() {
  const exportCols = columns.filter(c => c.key !== 'actions').map(c => ({ title: c.title, key: c.key }))
  const rows = filteredData.value.map(r => ({
    ...r,
    layer: LAYER_TEXT[r.layer] || r.layer,
    keyCustomers: (r.keyCustomers || []).join('; '),
  }))
  exportCSV(exportCols, rows, 'chainsight_watchlist.csv')
  message.success('已导出 CSV')
}
</script>

<style scoped>
.watch-table {
  padding: 16px;
}
</style>
