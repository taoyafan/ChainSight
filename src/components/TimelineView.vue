<template>
  <div class="timeline-view">
    <n-space align="center" style="margin-bottom: 16px;">
      <n-text>按环节筛选：</n-text>
      <n-select
        v-model:value="filterLayer"
        :options="layerOptions"
        clearable
        placeholder="全部环节"
        style="width: 160px;"
      />
      <n-select
        v-model:value="filterType"
        :options="typeOptions"
        clearable
        placeholder="全部类型"
        style="width: 140px;"
      />
    </n-space>

    <n-timeline size="large">
      <n-timeline-item
        v-for="event in displayEvents"
        :key="event.id || `${event.date}-${event.title}`"
        :type="timelineType(event.type)"
      >
        <div class="timeline-event">
          <n-text depth="3" class="timeline-date">
            {{ event.date }}
          </n-text>
          <div class="timeline-body">
            <div class="timeline-header">
              <n-space align="center" size="small">
                <n-tag size="small" :type="eventTagType(event.type)">
                  {{ EVENT_TYPE_TEXT[event.type] || event.type }}
                </n-tag>
                <n-button
                  v-if="event.sourceReportId"
                  text
                  type="primary"
                  class="timeline-title-button"
                  @click="handleReportClick(event.sourceReportId)"
                >
                  {{ event.title }}
                </n-button>
                <n-text v-else strong>{{ event.title }}</n-text>
              </n-space>
            </div>
            <n-text depth="2">{{ event.summary }}</n-text>
            <div v-if="event.relatedNodeIds?.length" style="margin-top: 6px;">
              <n-space size="small">
                <n-button
                  v-for="nid in event.relatedNodeIds"
                  :key="nid"
                  text
                  type="primary"
                  size="small"
                  @click="handleNodeClick(nid)"
                >
                  {{ nodeLabel(nid) }}
                </n-button>
              </n-space>
            </div>
            <n-space align="center" size="small" style="margin-top: 8px;">
              <n-tooltip v-if="!event.sourceReportId" trigger="hover">
                <template #trigger>
                  <n-text depth="3" class="forecast-note">
                    影响预测
                  </n-text>
                </template>
                未绑定报告的事件后续可自动推导对产业链的影响
              </n-tooltip>
              <n-text v-else depth="3" style="font-size: 12px;">
                数据来自报告 JSON
              </n-text>
              <FeedbackButton :context="event.title" />
            </n-space>
          </div>
        </div>
      </n-timeline-item>
    </n-timeline>

    <n-empty v-if="displayEvents.length === 0" description="暂无匹配事件" />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import {
  NTimeline, NTimelineItem, NSpace, NText, NTag,
  NSelect, NButton, NTooltip, NEmpty
} from 'naive-ui'
import FeedbackButton from './FeedbackButton.vue'
import { useEventStore } from '@/stores/eventStore'
import { useGraphStore } from '@/stores/graphStore'
import { EVENT_TYPE_TEXT, LAYER_TEXT } from '@/utils/helpers'

const emit = defineEmits(['go-to-node', 'go-to-report'])

const eventStore = useEventStore()
const graphStore = useGraphStore()

const filterLayer = ref(null)
const filterType = ref(null)

const layerOptions = computed(() =>
  Object.entries(LAYER_TEXT).map(([v, l]) => ({ label: l, value: v }))
)

const typeOptions = computed(() =>
  Object.entries(EVENT_TYPE_TEXT).map(([v, l]) => ({ label: l, value: v }))
)

const displayEvents = computed(() => {
  let list = eventStore.sortedEvents

  if (filterType.value) {
    list = list.filter(e => e.type === filterType.value)
  }

  if (filterLayer.value) {
    const nodeMap = graphStore.nodeMap
    list = list.filter(e =>
      e.relatedNodeIds?.some(nid => nodeMap[nid]?.layer === filterLayer.value)
    )
  }

  return list
})

function nodeLabel(nodeId) {
  return graphStore.nodeMap[nodeId]?.label || nodeId
}

function handleNodeClick(nodeId) {
  graphStore.setHighlightNodes([nodeId])
  emit('go-to-node', nodeId)
}

function handleReportClick(reportId) {
  emit('go-to-report', reportId)
}

function timelineType(type) {
  const map = { sampling: 'warning', certification: 'success', yield: 'info', order: 'error', report: 'info', financial_report: 'info', other: 'default' }
  return map[type] || 'default'
}

function eventTagType(type) {
  const map = { sampling: 'warning', certification: 'success', yield: 'info', order: 'error', report: 'info', financial_report: 'info', other: 'default' }
  return map[type] || 'default'
}
</script>

<style scoped>
.timeline-view {
  padding: 16px;
  max-width: 900px;
}

.timeline-event {
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr);
  gap: 14px;
  align-items: flex-start;
}

.timeline-date {
  font-size: 12px;
  line-height: 24px;
  white-space: nowrap;
}

.timeline-body {
  min-width: 0;
}

.timeline-header {
  margin-bottom: 4px;
}

.timeline-title-button {
  max-width: 100%;
  font-weight: 700;
  white-space: normal;
  text-align: left;
  line-height: 1.35;
}

.forecast-note {
  cursor: help;
  font-size: 12px;
}

@media (max-width: 640px) {
  .timeline-event {
    grid-template-columns: 1fr;
    gap: 4px;
  }
}
</style>
