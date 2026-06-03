<template>
  <div class="topology-page">
    <n-space align="center" style="margin-bottom: 12px;">
      <n-h3 style="margin: 0;">CPO 产业链拓扑图</n-h3>
      <n-switch v-model:value="graphStore.showBottleneck" @update:value="graphStore.toggleBottleneck">
        <template #checked>隐藏瓶颈</template>
        <template #unchecked>显示潜在瓶颈</template>
      </n-switch>
    </n-space>

    <div class="graph-container">
      <TopologyGraph
        ref="graphRef"
        @node-click="handleNodeClick"
        @node-dblclick="handleNodeDblClick"
      />
    </div>

    <NodeDetailDrawer
      v-model:show="drawerVisible"
      :node="selectedNodeData"
      @company-click="handleCompanyClick"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { NSpace, NH3, NSwitch } from 'naive-ui'
import TopologyGraph from '@/components/TopologyGraph.vue'
import NodeDetailDrawer from '@/components/NodeDetailDrawer.vue'
import { useGraphStore } from '@/stores/graphStore'

const graphStore = useGraphStore()
const router = useRouter()
const graphRef = ref(null)
const drawerVisible = ref(false)

const selectedNodeData = computed(() => {
  if (!graphStore.selectedNodeId) return null
  return graphStore.nodes.find(n => n.id === graphStore.selectedNodeId) || null
})

function handleNodeClick(nodeId) {
  graphStore.selectNode(nodeId)
}

function handleNodeDblClick(nodeId) {
  graphStore.selectNode(nodeId)
  drawerVisible.value = true
}

function handleCompanyClick(companyId) {
  router.push({ name: 'watchlist', query: { company: companyId } })
}
</script>

<style scoped>
.topology-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 16px;
}
.graph-container {
  flex: 1;
  border: 1px solid var(--n-border-color, #e0e0e6);
  border-radius: 8px;
  overflow: hidden;
  min-height: 500px;
}
</style>
