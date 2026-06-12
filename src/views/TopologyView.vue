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
      <div class="signal-legend" title="文字信号颜色">
        <span><i class="legend-dot legend-dot--growth" />未来增长</span>
        <span><i class="legend-dot legend-dot--decline" />未来降低</span>
        <span><i class="legend-dot legend-dot--constraint" />数字带 ! 表示增长受约束</span>
      </div>
    </n-space>

    <div class="graph-container">
      <TopologyGraph
        ref="graphRef"
        @node-click="handleNodeClick"
        @node-dblclick="handleNodeDblClick"
        @edge-dblclick="handleEdgeDblClick"
      />
    </div>

    <NodeDetailDrawer
      v-model:show="drawerVisible"
      :node="selectedNodeData"
      @company-click="handleCompanyClick"
      @node-analysis="handleNodeAnalysis"
    />

    <EdgeDetailDrawer
      v-model:show="edgeDrawerVisible"
      :edge="selectedEdgeData"
      :node-map="graphStore.nodeMap"
      :analysis-date="analysisDate"
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
import EdgeDetailDrawer from '@/components/EdgeDetailDrawer.vue'
import { useGraphStore } from '@/stores/graphStore'

const graphStore = useGraphStore()
const { analysisDate } = storeToRefs(graphStore)
const router = useRouter()
const graphRef = ref(null)
const drawerVisible = ref(false)
const edgeDrawerVisible = ref(false)
const selectedEdgeId = ref(null)

if (!analysisDate.value) {
  graphStore.setAnalysisDate()
}

const selectedNodeData = computed(() => {
  if (!graphStore.selectedNodeId) return null
  return graphStore.nodes.find(n => n.id === graphStore.selectedNodeId) || null
})

const selectedEdgeData = computed(() => {
  if (!selectedEdgeId.value) return null
  const index = Number(String(selectedEdgeId.value).replace('edge-', ''))
  return Number.isInteger(index) ? graphStore.visibleEdges[index] || null : null
})

function handleNodeClick(nodeId) {
  graphStore.selectNode(nodeId)
}

function handleNodeDblClick(nodeId) {
  graphStore.selectNode(nodeId)
  edgeDrawerVisible.value = false
  drawerVisible.value = true
}

function handleEdgeDblClick(edgeId) {
  selectedEdgeId.value = edgeId
  drawerVisible.value = false
  edgeDrawerVisible.value = true
}

function handleCompanyClick(companyId) {
  router.push({ name: 'watchlist', query: { company: companyId } })
}

function handleNodeAnalysis(nodeId) {
  router.push({ name: 'node-analysis', params: { nodeId } })
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

.signal-legend {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  color: var(--n-text-color-3, #606266);
  font-size: 12px;
}

.signal-legend span {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  white-space: nowrap;
}

.legend-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  display: inline-block;
}

.legend-dot--growth {
  background: #16a34a;
}

.legend-dot--decline {
  background: #dc2626;
}

.legend-dot--constraint {
  background: #16a34a;
  box-shadow: 0 0 0 2px #dcfce7;
}
</style>
