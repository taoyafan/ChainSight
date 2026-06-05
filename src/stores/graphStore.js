import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import nodesData from '@/data/taxonomy/nodes.json'
import edgesData from '@/data/taxonomy/edges.json'

export const useGraphStore = defineStore('graph', () => {
  const nodes = ref(nodesData)
  const edges = ref(edgesData)
  const selectedNodeId = ref(null)
  const highlightNodeIds = ref([])
  const showBottleneck = ref(false)
  const analysisDate = ref(new Date().toISOString().slice(0, 10))

  const nodeMap = computed(() => {
    const map = {}
    nodes.value.forEach(n => { map[n.id] = n })
    return map
  })

  const layerGroups = computed(() => {
    const groups = {}
    nodes.value.forEach(n => {
      if (!groups[n.layer]) groups[n.layer] = []
      groups[n.layer].push(n)
    })
    return groups
  })

  // 获取某节点的直接上游 & 下游节点 id
  function getNeighborIds(nodeId) {
    const upstream = edges.value.filter(e => e.target === nodeId).map(e => e.source)
    const downstream = edges.value.filter(e => e.source === nodeId).map(e => e.target)
    return { upstream, downstream, all: [...upstream, ...downstream] }
  }

  function selectNode(nodeId) {
    selectedNodeId.value = nodeId
    if (nodeId) {
      const { all } = getNeighborIds(nodeId)
      highlightNodeIds.value = [nodeId, ...all]
    } else {
      highlightNodeIds.value = []
    }
  }

  function clearSelection() {
    selectedNodeId.value = null
    highlightNodeIds.value = []
  }

  function setHighlightNodes(ids) {
    highlightNodeIds.value = ids
  }

  function toggleBottleneck(val) {
    showBottleneck.value = val ?? !showBottleneck.value
  }

  function setAnalysisDate(date) {
    analysisDate.value = date || new Date().toISOString().slice(0, 10)
  }

  return {
    nodes, edges, selectedNodeId, highlightNodeIds, showBottleneck, analysisDate,
    nodeMap, layerGroups,
    getNeighborIds, selectNode, clearSelection, setHighlightNodes, toggleBottleneck, setAnalysisDate
  }
})
