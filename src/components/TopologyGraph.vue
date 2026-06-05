<template>
  <div ref="containerRef" class="topology-graph" />
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { Graph } from '@antv/g6'
import { useGraphStore } from '@/stores/graphStore'
import { buildGraphData, getGraphOptions } from '@/utils/g6Config'

const emit = defineEmits(['node-click', 'node-dblclick'])

const containerRef = ref(null)
const graphStore = useGraphStore()
let graph = null

// 构建批量状态对象
function buildStateMap(fn) {
  const stateMap = {}
  graphStore.nodes.forEach(n => { stateMap[n.id] = fn(n.id, 'node') })
  graphStore.edges.forEach((e, i) => { stateMap[`edge-${i}`] = fn(`edge-${i}`, 'edge', e) })
  return stateMap
}

function withBottleneckState(nodeId, state) {
  const states = state ? [state] : []
  const node = graphStore.nodes.find(n => n.id === nodeId)
  if (graphStore.showBottleneck && node?.bottleneck) {
    states.push('bottleneck')
  }
  return states
}

async function refreshElementStates() {
  if (graphStore.selectedNodeId) {
    await applyHighlight(graphStore.selectedNodeId)
  } else if (graphStore.highlightNodeIds.length > 0) {
    await highlightNodes(graphStore.highlightNodeIds)
  } else {
    await clearHighlight()
  }
}

async function applyHighlight(nodeId) {
  if (!graph) return
  const neighbors = graphStore.getNeighborIds(nodeId)
  const highlightSet = new Set([nodeId, ...neighbors.all])

  const stateMap = buildStateMap((id, type, edgeData) => {
    if (type === 'node') {
      return withBottleneckState(id, highlightSet.has(id) ? 'highlight' : 'dim')
    }
    // edge
    return (edgeData.source === nodeId || edgeData.target === nodeId) ? 'highlight' : 'dim'
  })

  await graph.setElementState(stateMap)
}

async function clearHighlight() {
  if (!graph) return
  const stateMap = buildStateMap((id, type) => {
    if (type === 'node') return withBottleneckState(id)
    return []
  })
  await graph.setElementState(stateMap)
}

async function applyBottleneck() {
  if (!graph) return
  await refreshElementStates()
}

async function highlightNodes(ids) {
  if (!graph) return
  const highlightSet = new Set(ids)
  const stateMap = buildStateMap((id, type) => {
    if (type === 'node') {
      return withBottleneckState(id, highlightSet.has(id) ? 'highlight' : 'dim')
    }
    return 'dim'
  })
  await graph.setElementState(stateMap)
}

function handleKeydown(e) {
  if (e.key === 'Escape') {
    graphStore.clearSelection()
    clearHighlight()
  }
}

function mountGraph() {
  if (!containerRef.value) return
  const rect = containerRef.value.getBoundingClientRect()
  const options = getGraphOptions(containerRef.value, rect.width, rect.height || 600)
  const graphData = buildGraphData(graphStore.nodes, graphStore.edges, graphStore.analysisDate)

  graph = new Graph({
    ...options,
    data: graphData,
  })

  graph.render()

  graph.on('node:click', async (evt) => {
    const nodeId = evt.target?.id
    if (!nodeId) return
    graphStore.selectNode(nodeId)
    await applyHighlight(nodeId)
    emit('node-click', nodeId)
  })

  graph.on('node:dblclick', (evt) => {
    const nodeId = evt.target?.id
    if (nodeId) emit('node-dblclick', nodeId)
  })

  graph.on('canvas:click', async () => {
    graphStore.clearSelection()
    await clearHighlight()
  })

  graph.on('canvas:dblclick', async () => {
    graphStore.clearSelection()
    await clearHighlight()
  })
}

onMounted(() => {
  mountGraph()
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  if (graph) {
    graph.destroy()
    graph = null
  }
})

watch(() => graphStore.showBottleneck, (val) => {
  applyBottleneck(val)
})

watch(() => graphStore.analysisDate, async () => {
  if (!graph) return
  graph.destroy()
  graph = null
  graphStore.clearSelection()
  mountGraph()
})

watch(() => graphStore.highlightNodeIds, (ids) => {
  if (ids.length > 0 && !graphStore.selectedNodeId) {
    highlightNodes(ids)
  }
})

defineExpose({ highlightNodes, clearHighlight })
</script>

<style scoped>
.topology-graph {
  width: 100%;
  height: 100%;
  min-height: 500px;
}
</style>
