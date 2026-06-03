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
      <n-select
        v-model:value="filterStage"
        :options="stageOptions"
        clearable
        placeholder="阶段"
        style="width: 120px;"
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
import { NDataTable, NSpace, NSelect, NButton, NTag, useMessage } from 'naive-ui'
import { useCompanyStore } from '@/stores/companyStore'
import FeedbackButton from './FeedbackButton.vue'
import { STATUS_TEXT, LAYER_TEXT, exportCSV } from '@/utils/helpers'

const emit = defineEmits(['go-to-company'])

const companyStore = useCompanyStore()
const message = useMessage()

const filterLayer = ref(null)
const filterStage = ref(null)

const layerOptions = computed(() =>
  Object.entries(LAYER_TEXT).map(([v, l]) => ({ label: l, value: v }))
)

const stageOptions = computed(() =>
  [
    { label: '研发', value: 'RnD' },
    { label: '送样', value: 'sampling' },
    { label: '量产', value: 'mass_prod' },
  ]
)

const filteredData = computed(() => {
  let list = companyStore.companies
  if (filterLayer.value) list = list.filter(c => c.layer === filterLayer.value)
  if (filterStage.value) list = list.filter(c => c.stage === filterStage.value)
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
    title: '当前阶段',
    key: 'stage',
    width: 90,
    render(row) {
      const typeMap = { RnD: 'default', sampling: 'warning', mass_prod: 'success' }
      return h(NTag, { size: 'small', type: typeMap[row.stage] || 'default' }, () => STATUS_TEXT[row.stage] || row.stage)
    },
  },
  {
    title: '量产时间窗口',
    key: 'massProductionEta',
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
    stage: STATUS_TEXT[r.stage] || r.stage,
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
