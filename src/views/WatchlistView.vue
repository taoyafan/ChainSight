<template>
  <div style="padding: 16px;">
    <n-h3 style="margin-top: 0;">标的观察表</n-h3>
    <WatchTable @go-to-company="handleGoToCompany" />
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { NH3 } from 'naive-ui'
import WatchTable from '@/components/WatchTable.vue'
import { useGraphStore } from '@/stores/graphStore'
import { useCompanyStore } from '@/stores/companyStore'
import { getCompanyReportHighlight } from '@/utils/reportRepository'

const router = useRouter()
const graphStore = useGraphStore()
const companyStore = useCompanyStore()

function getCompanyHighlight(companyId) {
  const reportHighlight = getCompanyReportHighlight(companyId)
  const nodeIds = [...new Set([
    ...reportHighlight.nodeIds,
    ...reportHighlight.contextNodeIds,
  ])]
  const edgeKeySet = new Set(reportHighlight.edgeKeys)
  const edgeIds = []

  graphStore.visibleEdges.forEach((edge, index) => {
    const visibleKey = `${edge.source}->${edge.target}`
    const childKeys = (edge.childEdges || []).map(item => `${item.source}->${item.target}`)
    if (edgeKeySet.has(visibleKey) || childKeys.some(key => edgeKeySet.has(key))) {
      edgeIds.push(`edge-${index}`)
    }
  })

  return {
    nodeIds,
    edgeIds,
  }
}

function handleGoToCompany(companyId) {
  const reportRow = companyStore.watchRows.find(c => c.id === companyId)
  const relatedNodes = reportRow?.relatedNodeIds || []
  const { nodeIds, edgeIds } = getCompanyHighlight(companyId)
  const fallbackNodeIds = nodeIds.length > 0 ? nodeIds : relatedNodes
  graphStore.setHighlightNodes(fallbackNodeIds, edgeIds)
  router.push({ name: 'topology' })
}
</script>
