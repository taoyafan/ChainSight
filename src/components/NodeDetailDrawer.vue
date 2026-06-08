<template>
  <n-drawer v-model:show="visible" :width="420" placement="right">
    <n-drawer-content :title="node?.label || '节点详情'" closable>
      <template v-if="node">
        <n-descriptions :column="1" label-placement="left" bordered size="small">
          <n-descriptions-item label="当前状态">
            <n-tag :type="statusType" size="small">{{ STATUS_TEXT[node.status] || node.status }}</n-tag>
          </n-descriptions-item>
          <n-descriptions-item label="替代方案有限性">
            {{ node.altLimitNote || '—' }}
          </n-descriptions-item>
        </n-descriptions>

        <!-- 瓶颈标记 -->
        <n-alert v-if="node.bottleneck" type="warning" title="潜在瓶颈" style="margin-top: 16px;">
          {{ node.bottleneckNote }}
        </n-alert>

        <n-card size="small" style="margin-top: 16px;" :bordered="true">
          <template #header>收入 proxy 份额</template>
          <n-space v-if="revenueItems.length" vertical size="small">
            <div
              v-for="item in revenueItems.slice(0, 3)"
              :key="item.companyId"
              class="share-row"
            >
              <div class="share-row__meta">
                <n-text>{{ item.company.name }}</n-text>
                <n-text depth="3">{{ formatPercent(item.share) }}</n-text>
              </div>
              <div class="share-bar">
                <div class="share-bar__fill" :style="{ width: formatPercent(item.share) }" />
              </div>
            </div>
            <n-button size="small" secondary type="primary" @click="handleAnalysisClick">
              查看完整分析
            </n-button>
          </n-space>
          <n-empty v-else size="small" description="暂无可估算收入 proxy" />
        </n-card>

        <!-- 主要供应商 -->
        <n-h4 style="margin-top: 20px;">观察表覆盖公司</n-h4>
        <n-list v-if="nodeCompanies.length" bordered>
          <n-list-item v-for="company in nodeCompanies" :key="company.id">
            <template v-if="company">
              <n-thing>
                <template #header>
                  <n-button text @click="handleCompanyClick(company.id)">
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
            </template>
          </n-list-item>
        </n-list>
        <n-empty v-else size="small" description="标的观察表暂无覆盖公司" />

        <!-- 反馈按钮 -->
        <div style="margin-top: 16px; text-align: right;">
          <FeedbackButton :context="node.label" />
        </div>
      </template>
    </n-drawer-content>
  </n-drawer>
</template>

<script setup>
import { computed } from 'vue'
import {
  NDrawer, NDrawerContent, NDescriptions, NDescriptionsItem,
  NTag, NAlert, NCard, NSpace, NText, NH4,
  NList, NListItem, NThing, NButton, NEmpty
} from 'naive-ui'
import FeedbackButton from './FeedbackButton.vue'
import { STATUS_TEXT } from '@/utils/helpers'
import { getNodeRevenueProxyItems, getNodeWatchRows } from '@/utils/reportRepository'

const props = defineProps({
  node: { type: Object, default: null },
})

const visible = defineModel('show', { type: Boolean, default: false })

const emit = defineEmits(['company-click', 'node-analysis'])

const nodeCompanies = computed(() => getNodeWatchRows(props.node?.id))
const revenueItems = computed(() => getNodeRevenueProxyItems(props.node?.id))

const statusType = computed(() => {
  const map = { RnD: 'default', sampling: 'warning', mass_prod: 'success' }
  return map[props.node?.status] || 'default'
})

function stageTagType(stage) {
  const map = { RnD: 'default', sampling: 'warning', mass_prod: 'success' }
  return map[stage] || 'default'
}

function handleCompanyClick(companyId) {
  emit('company-click', companyId)
}

function handleAnalysisClick() {
  if (!props.node?.id) return
  emit('node-analysis', props.node.id)
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return '—'
  return `${(value * 100).toFixed(value >= 0.1 ? 0 : 1)}%`
}
</script>

<style scoped>
.share-row {
  display: grid;
  gap: 6px;
}

.share-row__meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
}

.share-bar {
  height: 8px;
  overflow: hidden;
  border-radius: 4px;
  background: rgba(99, 102, 241, 0.12);
}

.share-bar__fill {
  height: 100%;
  border-radius: inherit;
  background: #2563eb;
}
</style>
