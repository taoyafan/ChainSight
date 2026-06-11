<template>
  <div ref="containerRef" class="topology-graph" />
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { Graph } from '@antv/g6'
import { useGraphStore } from '@/stores/graphStore'
import { buildGraphData, getGraphOptions } from '@/utils/g6Config'

const emit = defineEmits(['node-click', 'node-dblclick', 'edge-dblclick'])

const containerRef = ref(null)
const graphStore = useGraphStore()
let graph = null
const POSITION_STORAGE_KEY = 'chainsight.topology.nodePositions.v1'
const nodePositionCache = loadStoredNodePositions()

// 构建批量状态对象
function buildStateMap(fn) {
  const stateMap = {}
  graphStore.visibleNodes.forEach(n => { stateMap[n.id] = fn(n.id, 'node') })
  graphStore.visibleEdges.forEach((e, i) => { stateMap[`edge-${i}`] = fn(`edge-${i}`, 'edge', e) })
  return stateMap
}

function withBottleneckState(nodeId, state) {
  const states = state ? [state] : []
  const node = graphStore.nodeMap[nodeId]
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
  const edgeHighlightSet = new Set(graphStore.highlightEdgeIds)
  const stateMap = buildStateMap((id, type, edgeData) => {
    if (type === 'node') {
      return withBottleneckState(id, highlightSet.has(id) ? 'highlight' : 'dim')
    }
    return edgeHighlightSet.has(id) ? 'highlight' : 'dim'
  })
  await graph.setElementState(stateMap)
}

function handleKeydown(e) {
  if (e.key === 'Escape') {
    graphStore.clearSelection()
    clearHighlight()
  }
}

function isCollapseControlClick(evt) {
  let shape = evt.originalTarget
  while (shape && shape !== evt.target) {
    const shapeName = String(shape.className || shape.name || shape.id || '')
    if (shapeName.includes('badge')) return true
    shape = shape.parentElement
  }
  return false
}

function mountGraph() {
  if (!containerRef.value) return
  const rect = containerRef.value.getBoundingClientRect()
  const options = getGraphOptions(containerRef.value, rect.width, rect.height || 600)
  const graphData = withCachedNodePositions(
    buildGraphData(graphStore.visibleNodes, graphStore.visibleEdges, graphStore.analysisDate)
  )

  graph = new Graph({
    ...options,
    data: graphData,
  })

  Promise.resolve(graph.render()).then(() => {
    applyCachedPositions()
    rememberCurrentNodePositions()
    refreshElementStates()
  })

  graph.on('node:click', async (evt) => {
    const nodeId = evt.target?.id
    if (!nodeId) return
    if (nodeId === 'optical_module' && isCollapseControlClick(evt)) {
      graphStore.toggleNodeExpanded(nodeId)
      return
    }
    graphStore.selectNode(nodeId)
    await applyHighlight(nodeId)
    emit('node-click', nodeId)
  })

  graph.on('combo:click', (evt) => {
    if (evt.target?.id === 'optical_module_combo' && isCollapseControlClick(evt)) {
      graphStore.toggleNodeExpanded('optical_module')
    }
  })

  graph.on('node:dblclick', (evt) => {
    const nodeId = evt.target?.id
    if (nodeId) emit('node-dblclick', nodeId)
  })

  graph.on('edge:dblclick', (evt) => {
    const edgeId = evt.target?.id
    if (edgeId) emit('edge-dblclick', edgeId)
  })

  graph.on('node:dragend', () => {
    rememberCurrentNodePositions()
  })

  graph.on('afterelementtranslate', () => {
    rememberCurrentNodePositions()
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

function loadStoredNodePositions() {
  try {
    const raw = window.localStorage.getItem(POSITION_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return Object.fromEntries(
      Object.entries(parsed).filter(([, position]) => isValidPosition(position))
    )
  } catch {
    return {}
  }
}

function persistNodePositions() {
  try {
    window.localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(nodePositionCache))
  } catch {
    // Ignore storage errors; in-memory positions still work for this session.
  }
}

function isValidPosition(position) {
  return Array.isArray(position) && Number.isFinite(position[0]) && Number.isFinite(position[1])
}

function getRenderedNodeIds() {
  if (!graph) return []
  try {
    return graph.getNodeData().map(node => node.id)
  } catch {
    return []
  }
}

function rememberCurrentNodePositions() {
  if (!graph) return
  let changed = false
  for (const id of getRenderedNodeIds()) {
    try {
      const position = graph.getElementPosition(id)
      if (isValidPosition(position)) {
        nodePositionCache[id] = position
        changed = true
      }
    } catch {
      // The element may have just been removed from the graph data.
    }
  }
  if (changed) persistNodePositions()
}

function averagePosition(items) {
  const valid = items.filter(Boolean)
  if (valid.length === 0) return null
  return [
    valid.reduce((sum, item) => sum + item[0], 0) / valid.length,
    valid.reduce((sum, item) => sum + item[1], 0) / valid.length,
  ]
}

function inferNodePositions(nodes, basePositions) {
  const positions = { ...basePositions }
  const opticalModule = positions.optical_module
  if (opticalModule) {
    positions.eml_pluggable_module ||= [opticalModule[0], opticalModule[1] - 64]
    positions.silicon_photonic_pluggable_module ||= [opticalModule[0], opticalModule[1] + 64]
  }

  const moduleCenter = averagePosition([
    positions.eml_pluggable_module,
    positions.silicon_photonic_pluggable_module,
  ])
  if (moduleCenter) positions.optical_module ||= moduleCenter

  const visibleIds = new Set(nodes.map(node => node.id))
  return Object.fromEntries(
    Object.entries(positions).filter(([id]) => visibleIds.has(id))
  )
}

function withCachedNodePositions(graphData) {
  const positions = inferNodePositions(graphData.nodes, nodePositionCache)
  graphData.nodes = graphData.nodes.map(node => {
    const position = positions[node.id]
    if (!position) return node
    return {
      ...node,
      style: {
        ...(node.style || {}),
        x: position[0],
        y: position[1],
      },
    }
  })
  Object.assign(nodePositionCache, positions)
  persistNodePositions()
  return graphData
}

async function applyCachedPositions() {
  if (!graph) return
  const positions = {}
  for (const id of getRenderedNodeIds()) {
    const position = nodePositionCache[id]
    if (isValidPosition(position)) positions[id] = position
  }
  if (Object.keys(positions).length > 0) {
    await graph.translateElementTo(positions, false)
  }
}

async function updateGraphData() {
  if (!graph) return
  rememberCurrentNodePositions()
  const graphData = withCachedNodePositions(
    buildGraphData(graphStore.visibleNodes, graphStore.visibleEdges, graphStore.analysisDate)
  )

  graphStore.clearSelection()
  graph.setData(graphData)
  await graph.draw()
  rememberCurrentNodePositions()
  await refreshElementStates()
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

watch(() => graphStore.analysisDate, updateGraphData)

watch(() => graphStore.expandedNodeIds, updateGraphData, { deep: true })

watch(() => graphStore.highlightNodeIds, (ids) => {
  if (ids.length > 0 && !graphStore.selectedNodeId) {
    highlightNodes(ids)
  }
})

watch(() => graphStore.highlightEdgeIds, () => {
  if (graphStore.highlightNodeIds.length > 0 && !graphStore.selectedNodeId) {
    highlightNodes(graphStore.highlightNodeIds)
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
