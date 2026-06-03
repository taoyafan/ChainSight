/**
 * AntV G6 v5 配置 - CPO 产业链拓扑图
 */

// 层级顺序映射（用于 Dagre 布局的 rank）
export const LAYER_ORDER = {
  chip: 0,
  engine: 1,
  module: 2,
  system: 3,
  cloud: 4,
}

export const LAYER_LABELS = {
  chip: '硅光芯片',
  engine: '光引擎',
  module: 'CPO 模组',
  system: '系统集成',
  cloud: '云/算力',
}

export const STATUS_LABELS = {
  RnD: '研发',
  sampling: '送样',
  mass_prod: '量产',
}

export const STATUS_COLORS = {
  RnD: '#909399',
  sampling: '#E6A23C',
  mass_prod: '#67C23A',
}

const SIZE_MAP = { small: 90, medium: 120, large: 150 }

/**
 * 将原始节点/边数据转为 G6 v5 graph data
 */
export function buildGraphData(nodes, edges) {
  const g6Nodes = nodes.map(n => ({
    id: n.id,
    data: {
      label: n.label,
      layer: n.layer,
      status: n.status,
      bottleneck: n.bottleneck,
      bottleneckNote: n.bottleneckNote,
      marketSizeHint: n.marketSizeHint,
    },
  }))

  const g6Edges = edges.map((e, i) => ({
    id: `edge-${i}`,
    source: e.source,
    target: e.target,
    data: {
      strength: e.strength,
      label: e.label,
    },
  }))

  return { nodes: g6Nodes, edges: g6Edges }
}

/**
 * 返回 G6 v5 Graph 的配置项
 */
export function getGraphOptions(container, width, height) {
  return {
    container,
    width,
    height,
    autoFit: 'view',
    padding: [40, 60, 40, 60],
    layout: {
      type: 'dagre',
      rankdir: 'LR',
      nodesep: 80,
      ranksep: 140,
    },
    node: {
      type: 'rect',
      style: {
        radius: 8,
        size: (d) => {
          const w = SIZE_MAP[d.data?.marketSizeHint] || 80
          return [w + 90, 78]
        },
        opacity: 1,
        fill: '#fff',
        stroke: '#c0c4cc',
        lineWidth: 2,
        shadowBlur: 0,
        shadowColor: 'rgba(0,0,0,0)',
        labelText: (d) => d.data?.label || d.id,
        labelFill: '#303133',
        labelFontSize: 24,
        labelFontWeight: 600,
        labelPlacement: 'center',
        // 右下角状态标签通过 badges 实现
        badges: (d) => [
          {
            text: STATUS_LABELS[d.data?.status] || '',
            placement: 'right-bottom',
            backgroundFill: STATUS_COLORS[d.data?.status] || '#909399',
            fill: '#fff',
            fontSize: 18,
          },
        ],
      },
      state: {
        selected: {
          fill: '#fff',
          stroke: '#409EFF',
          lineWidth: 3,
          shadowColor: 'rgba(64,158,255,0.4)',
          shadowBlur: 10,
        },
        highlight: {
          opacity: 1,
          fill: '#fff',
          stroke: '#409EFF',
          lineWidth: 2,
          shadowBlur: 0,
          shadowColor: 'rgba(0,0,0,0)',
        },
        dim: {
          opacity: 0.25,
        },
        bottleneck: {
          fill: '#FEF0F0',
          stroke: '#F56C6C',
          lineWidth: 3,
          shadowColor: 'rgba(245,108,108,0.16)',
          shadowBlur: 4,
        },
      },
    },
    edge: {
      type: 'cubic-horizontal',
      style: {
        opacity: 1,
        stroke: '#c0c4cc',
        lineWidth: (d) => Math.max(1, (d.data?.strength || 0.5) * 4),
        endArrow: true,
        endArrowSize: 6,
        labelText: (d) => d.data?.label || '',
        labelFill: '#909399',
        labelFontSize: 18,
        labelBackground: true,
        labelBackgroundFill: '#fff',
        labelBackgroundOpacity: 0.85,
        labelBackgroundRadius: 3,
      },
      state: {
        highlight: {
          opacity: 1,
          stroke: '#409EFF',
          lineWidth: 2.5,
        },
        dim: {
          opacity: 0.15,
        },
      },
    },
    behaviors: ['drag-canvas', 'zoom-canvas', 'drag-element'],
    animation: true,
  }
}
