<template>
  <div class="timeline-view">
    <!-- 筛选栏 -->
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

    <!-- 时间线 -->
    <n-timeline size="large">
      <n-timeline-item
        v-for="event in displayEvents"
        :key="event.date + event.title"
        :type="timelineType(event.type)"
        :title="event.title"
        :time="event.date"
      >
        <template #header>
          <n-space align="center" size="small">
            <n-tag size="small" :type="eventTagType(event.type)">
              {{ EVENT_TYPE_TEXT[event.type] || event.type }}
            </n-tag>
            <n-text strong>{{ event.title }}</n-text>
          </n-space>
        </template>
        <n-text depth="2">{{ event.summary }}</n-text>
        <div style="margin-top: 6px;">
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
        <template #footer>
          <n-space align="center" size="small">
            <n-tooltip trigger="hover">
              <template #trigger>
                <n-text depth="3" style="cursor: help; font-size: 12px;">
                  🔮 影响预测
                </n-text>
              </template>
              未来将自动推导该事件对产业链的影响
            </n-tooltip>
            <FeedbackButton :context="event.title" />
          </n-space>
        </template>
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

const emit = defineEmits(['go-to-node'])

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
      e.relatedNodeIds.some(nid => nodeMap[nid]?.layer === filterLayer.value)
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

function timelineType(type) {
  const map = { sampling: 'warning', certification: 'success', yield: 'info', order: 'error', other: 'default' }
  return map[type] || 'default'
}

function eventTagType(type) {
  const map = { sampling: 'warning', certification: 'success', yield: 'info', order: 'error', other: 'default' }
  return map[type] || 'default'
}
</script>

<style scoped>
.timeline-view {
  padding: 16px;
  max-width: 800px;
}
</style>
