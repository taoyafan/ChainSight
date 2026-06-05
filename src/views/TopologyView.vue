<template>
  <div class="topology-page">
    <n-space align="center" style="margin-bottom: 12px;">
      <n-h3 style="margin: 0;">CPO 产业链拓扑图</n-h3>
      <input
        class="analysis-date-input"
        type="date"
        :value="analysisDate"
        title="观察日期"
        @change="graphStore.setAnalysisDate($event.target.value)"
      />
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
import { storeToRefs } from 'pinia'
import { NSpace, NH3, NSwitch } from 'naive-ui'
import TopologyGraph from '@/components/TopologyGraph.vue'
import NodeDetailDrawer from '@/components/NodeDetailDrawer.vue'
import { useGraphStore } from '@/stores/graphStore'

const graphStore = useGraphStore()
const { analysisDate } = storeToRefs(graphStore)
const router = useRouter()
const graphRef = ref(null)
const drawerVisible = ref(false)

if (!analysisDate.value) {
  graphStore.setAnalysisDate()
}

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

.analysis-date-input {
  width: 160px;
  height: 34px;
  box-sizing: border-box;
  border: 1px solid var(--n-border-color, #dcdfe6);
  border-radius: 4px;
  padding: 0 10px;
  color: var(--n-text-color, #303133);
  background: var(--n-color, #fff);
  font: inherit;
}
</style>
