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

const router = useRouter()
const graphStore = useGraphStore()
const companyStore = useCompanyStore()

function handleGoToCompany(companyId) {
  const reportRow = companyStore.watchRows.find(c => c.id === companyId)
  const reportNodes = reportRow?.relatedNodeIds || []
  const relatedNodes = reportNodes.length > 0
    ? reportNodes
    : graphStore.nodes
      .filter(n => n.companies?.includes(companyId))
      .map(n => n.id)
  graphStore.setHighlightNodes(relatedNodes)
  router.push({ name: 'topology' })
}
</script>
