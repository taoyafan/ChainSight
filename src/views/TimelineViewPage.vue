<template>
  <div style="padding: 16px;">
    <n-h3 style="margin-top: 0;">产业链变化时间线</n-h3>
    <TimelineView
      @go-to-node="handleGoToNode"
      @go-to-report="handleGoToReport"
    />
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { NH3 } from 'naive-ui'
import TimelineView from '@/components/TimelineView.vue'
import { useGraphStore } from '@/stores/graphStore'

const router = useRouter()
const graphStore = useGraphStore()

function handleGoToNode(nodeId) {
  graphStore.setHighlightNodes([nodeId])
  router.push({ name: 'topology' })
}

function handleGoToReport(reportId) {
  router.push({ name: 'report-detail', params: { reportId } })
}
</script>
