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

const router = useRouter()
const graphStore = useGraphStore()

function handleGoToCompany(companyId) {
  // 找到该公司关联的所有节点并高亮
  const relatedNodes = graphStore.nodes
    .filter(n => n.companies?.includes(companyId))
    .map(n => n.id)
  graphStore.setHighlightNodes(relatedNodes)
  router.push({ name: 'topology' })
}
</script>
