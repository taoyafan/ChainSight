import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import nodesData from '@/data/taxonomy/nodes.json'
import edgesData from '@/data/taxonomy/edges.json'

export const useGraphStore = defineStore('graph', () => {
  const nodes = ref(nodesData)
  const edges = ref(edgesData)
  const selectedNodeId = ref(null)
  const highlightNodeIds = ref([])
  const highlightEdgeIds = ref([])
  const showBottleneck = ref(false)
  const analysisDate = ref(new Date().toISOString().slice(0, 10))
  const expandedNodeIds = ref([])

  const COLLAPSIBLE_NODE_CHILDREN = {
    optical_module: ['eml_pluggable_module', 'silicon_photonic_pluggable_module'],
  }

  const nodeMap = computed(() => {
    const map = {}
    nodes.value.forEach(n => { map[n.id] = n })
    return map
  })

  const visibleNodes = computed(() => {
    const expanded = new Set(expandedNodeIds.value)
    const hidden = new Set()
    Object.entries(COLLAPSIBLE_NODE_CHILDREN).forEach(([parentId, childIds]) => {
      if (expanded.has(parentId)) hidden.add(parentId)
      else childIds.forEach(id => hidden.add(id))
    })
    return nodes.value.filter(n => !hidden.has(n.id))
  })

  const visibleNodeIdSet = computed(() => new Set(visibleNodes.value.map(n => n.id)))

  const visibleEdges = computed(() => {
    const expanded = new Set(expandedNodeIds.value)
    const parentByChild = {}
    Object.entries(COLLAPSIBLE_NODE_CHILDREN).forEach(([parentId, childIds]) => {
      if (!expanded.has(parentId)) childIds.forEach(id => { parentByChild[id] = parentId })
    })

    const aggregated = new Map()
    edges.value.forEach(edge => {
      const source = parentByChild[edge.source] || edge.source
      const target = parentByChild[edge.target] || edge.target
      if (source === target) return
      if (!visibleNodeIdSet.value.has(source) || !visibleNodeIdSet.value.has(target)) return

      const key = `${source}->${target}`
      const existing = aggregated.get(key)
      if (existing) {
        existing.transactionAmountQuarterUsd += edge.transactionAmountQuarterUsd || 0
        if (!existing.labels.includes(edge.label)) existing.labels.push(edge.label)
        existing.childEdges.push(edge)
        existing.aggregated = existing.aggregated || source !== edge.source || target !== edge.target
      } else {
        aggregated.set(key, {
          source,
          target,
          transactionAmountQuarterUsd: edge.transactionAmountQuarterUsd || 0,
          label: edge.label,
          labels: edge.label ? [edge.label] : [],
          childEdges: [edge],
          aggregated: source !== edge.source || target !== edge.target,
        })
      }
    })

    return [...aggregated.values()].map(edge => ({
      ...edge,
      label: edge.aggregated
        ? `${edge.labels[0] || '聚合链路'}${edge.labels.length > 1 ? ` 等 ${edge.labels.length} 条` : ''}`
        : edge.label,
    }))
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
    const upstream = visibleEdges.value.filter(e => e.target === nodeId).map(e => e.source)
    const downstream = visibleEdges.value.filter(e => e.source === nodeId).map(e => e.target)
    return { upstream, downstream, all: [...upstream, ...downstream] }
  }

  function selectNode(nodeId) {
    selectedNodeId.value = nodeId
    if (nodeId) {
      const { all } = getNeighborIds(nodeId)
      highlightNodeIds.value = [nodeId, ...all]
      highlightEdgeIds.value = []
    } else {
      highlightNodeIds.value = []
      highlightEdgeIds.value = []
    }
  }

  function clearSelection() {
    selectedNodeId.value = null
    highlightNodeIds.value = []
    highlightEdgeIds.value = []
  }

  function setHighlightNodes(ids, edgeIds = []) {
    selectedNodeId.value = null
    highlightNodeIds.value = ids
    highlightEdgeIds.value = edgeIds
  }

  function toggleBottleneck(val) {
    showBottleneck.value = val ?? !showBottleneck.value
  }

  function setAnalysisDate(date) {
    analysisDate.value = date || new Date().toISOString().slice(0, 10)
  }

  function isNodeExpanded(nodeId) {
    return expandedNodeIds.value.includes(nodeId)
  }

  function toggleNodeExpanded(nodeId) {
    if (!COLLAPSIBLE_NODE_CHILDREN[nodeId]) return
    expandedNodeIds.value = isNodeExpanded(nodeId)
      ? expandedNodeIds.value.filter(id => id !== nodeId)
      : [...expandedNodeIds.value, nodeId]
    clearSelection()
  }

  return {
    nodes, edges, visibleNodes, visibleEdges, selectedNodeId, highlightNodeIds, highlightEdgeIds,
    showBottleneck, analysisDate, expandedNodeIds,
    nodeMap, layerGroups,
    getNeighborIds, selectNode, clearSelection, setHighlightNodes, toggleBottleneck, setAnalysisDate,
    isNodeExpanded, toggleNodeExpanded
  }
})
