<template>
  <n-drawer v-model:show="visible" :width="420" placement="right">
    <n-drawer-content :title="node?.label || '节点详情'" closable>
      <template v-if="node">
        <n-descriptions :column="1" label-placement="left" bordered size="small">
          <n-descriptions-item label="产业链层级">
            {{ LAYER_TEXT[node.layer] || node.layer }}
          </n-descriptions-item>
          <n-descriptions-item label="当前状态">
            <n-tag :type="statusType" size="small">{{ STATUS_TEXT[node.status] || node.status }}</n-tag>
          </n-descriptions-item>
          <n-descriptions-item label="CPO 成本占比">
            {{ node.costRatio || '—' }}
          </n-descriptions-item>
          <n-descriptions-item label="替代方案有限性">
            {{ node.altLimitNote || '—' }}
          </n-descriptions-item>
        </n-descriptions>

        <!-- 瓶颈标记 -->
        <n-alert v-if="node.bottleneck" type="warning" title="潜在瓶颈" style="margin-top: 16px;">
          {{ node.bottleneckNote }}
        </n-alert>

        <!-- 预留字段 -->
        <n-card size="small" style="margin-top: 16px;" :bordered="true">
          <n-space vertical>
            <n-text depth="3"><n-icon size="14"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg></n-icon> 瓶颈指数：<n-tag size="tiny" :bordered="false" type="default">即将上线</n-tag></n-text>
            <n-text depth="3"><n-icon size="14"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg></n-icon> 供需缺口：<n-tag size="tiny" :bordered="false" type="default">即将上线</n-tag></n-text>
          </n-space>
        </n-card>

        <!-- 主要供应商 -->
        <n-h4 style="margin-top: 20px;">主要供应商</n-h4>
        <n-list bordered>
          <n-list-item v-for="cid in node.companies" :key="cid">
            <template v-if="companyMap[cid]">
              <n-thing>
                <template #header>
                  <n-button text @click="handleCompanyClick(cid)">
                    {{ companyMap[cid].name }}
                  </n-button>
                  <n-text depth="3" style="margin-left: 8px;">{{ companyMap[cid].ticker }}</n-text>
                </template>
                <template #description>
                  <n-space size="small">
                    <n-tag size="tiny" :type="stageTagType(companyMap[cid].stage)">
                      {{ STATUS_TEXT[companyMap[cid].stage] || companyMap[cid].stage }}
                    </n-tag>
                    <n-text depth="3">{{ companyMap[cid].techRoute }}</n-text>
                  </n-space>
                </template>
              </n-thing>
            </template>
            <template v-else>
              <n-text>{{ cid }}</n-text>
            </template>
          </n-list-item>
        </n-list>

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
  NTag, NAlert, NCard, NSpace, NText, NIcon, NH4,
  NList, NListItem, NThing, NButton
} from 'naive-ui'
import FeedbackButton from './FeedbackButton.vue'
import { useCompanyStore } from '@/stores/companyStore'
import { STATUS_TEXT, LAYER_TEXT } from '@/utils/helpers'

const props = defineProps({
  node: { type: Object, default: null },
})

const visible = defineModel('show', { type: Boolean, default: false })

const emit = defineEmits(['company-click'])

const companyStore = useCompanyStore()
const companyMap = computed(() => companyStore.companyMap)

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
</script>
