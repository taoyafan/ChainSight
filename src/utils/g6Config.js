import { getBestEdgeGrowthAsOf, getEdgeGrowthSignalsAsOf } from '@/utils/reportRepository'

/**
 * AntV G6 v5 配置 - 产业链拓扑图
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
  module: '光模块/模组',
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
const MIN_EDGE_WIDTH = 1.2
const MAX_EDGE_WIDTH = 24
const NEUTRAL_EDGE_WIDTH = 6
const POSITIVE_GROWTH_CAP = 2
const NEGATIVE_GROWTH_CAP = 1
const EDGE_GROWTH_METRICS = new Set([
  'revenue_growth_yoy_proxy',
  'demand_growth_signal',
])

function formatYoy(value) {
  if (!Number.isFinite(value)) return '暂无 YoY 数据'
  const sign = value > 0 ? '+' : ''
  return `${sign}${(value * 100).toFixed(1)}% YoY`
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function toGrowthContribution({ report, signal }) {
  return {
    id: signal.id,
    metric: signal.metric,
    value: signal.value,
    period: signal.period,
    confidence: signal.confidence,
    companyName: report?.companyName,
    reportTitle: report?.title,
    reportId: report?.id,
    method: signal.method,
  }
}

function getGrowthEdgeStyle(growthValue) {
  if (!Number.isFinite(growthValue)) {
    return {
      lineWidth: NEUTRAL_EDGE_WIDTH,
      stroke: '#9ca3af',
      growthTone: 'neutral',
    }
  }

  if (growthValue > 0.02) {
    const capped = Math.min(growthValue, POSITIVE_GROWTH_CAP)
    return {
      lineWidth: NEUTRAL_EDGE_WIDTH + (capped / POSITIVE_GROWTH_CAP) * (MAX_EDGE_WIDTH - NEUTRAL_EDGE_WIDTH),
      stroke: '#16a34a',
      growthTone: 'positive',
    }
  }

  if (growthValue < -0.02) {
    const capped = Math.min(Math.abs(growthValue), NEGATIVE_GROWTH_CAP)
    return {
      lineWidth: NEUTRAL_EDGE_WIDTH - (capped / NEGATIVE_GROWTH_CAP) * (NEUTRAL_EDGE_WIDTH - MIN_EDGE_WIDTH),
      stroke: '#dc2626',
      growthTone: 'negative',
    }
  }

  return {
    lineWidth: NEUTRAL_EDGE_WIDTH,
    stroke: '#9ca3af',
    growthTone: 'flat',
  }
}

/**
 * 将原始节点/边数据转为 G6 v5 graph data
 */
export function buildGraphData(nodes, edges, analysisDate) {
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

  const g6Edges = edges.map((e, i) => {
    const growthEvidence = getBestEdgeGrowthAsOf(e.source, e.target, analysisDate)
    const growthContributions = getEdgeGrowthSignalsAsOf(e.source, e.target, analysisDate)
      .filter(({ signal }) => EDGE_GROWTH_METRICS.has(signal.metric))
      .map(toGrowthContribution)
    const growthValue = growthEvidence?.signal?.value
    const growthStyle = getGrowthEdgeStyle(growthValue)

    return {
      id: `edge-${i}`,
      source: e.source,
      target: e.target,
      data: {
        transactionAmountQuarterUsd: e.transactionAmountQuarterUsd,
        lineWidth: growthStyle.lineWidth,
        stroke: growthStyle.stroke,
        growthTone: growthStyle.growthTone,
        growthYoy: growthValue,
        growthMetric: growthEvidence?.signal?.metric,
        growthPeriod: growthEvidence?.signal?.period,
        growthConfidence: growthEvidence?.signal?.confidence,
        growthReportTitle: growthEvidence?.report?.title,
        growthCompanyName: growthEvidence?.report?.companyName,
        growthContributions,
        contributionCount: growthContributions.length,
        analysisDate,
        label: e.label,
      },
    }
  })

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
      nodesep: 240,
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
        stroke: (d) => d.data?.stroke || '#9ca3af',
        lineWidth: (d) => d.data?.lineWidth || MIN_EDGE_WIDTH,
        endArrow: true,
        endArrowSize: 6,
        labelText: (d) => {
          const label = d.data?.label || ''
          const count = d.data?.contributionCount || 0
          return count > 0 ? `${label} · ${count}报告` : label
        },
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
        },
        dim: {
          opacity: 0.15,
        },
      },
    },
    plugins: [
      {
        type: 'tooltip',
        trigger: 'hover',
        enable: (event, items) => {
          const edge = items?.[0]
          return edge?.id?.startsWith('edge-') || event.target?.id?.startsWith('edge-')
        },
        getContent: async (_event, items) => {
          const edge = items[0]
          const growthYoy = edge?.data?.growthYoy
          const hasGrowth = Number.isFinite(growthYoy)
          const confidence = edge?.data?.growthConfidence
          const contributions = edge?.data?.growthContributions || []
          const contributionHtml = contributions.length
            ? `
              <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #ebeef5; color: #303133; font-weight: 600;">报告贡献</div>
              ${contributions.map((item) => {
                const valueColor = Number.isFinite(item.value) && item.value < 0 ? '#dc2626' : Number.isFinite(item.value) && item.value > 0 ? '#16a34a' : '#606266'
                return `
                  <div style="margin-top: 4px; color: #606266;">
                    <div>
                      ${escapeHtml(item.companyName || '未知公司')}：
                      <span style="color: ${valueColor};">${formatYoy(item.value)}</span>
                      ${Number.isFinite(item.confidence) ? ` / 置信度 ${(item.confidence * 100).toFixed(0)}%` : ''}
                    </div>
                    <div style="color: #909399;">${escapeHtml(item.period || '')}${item.reportTitle ? ` · ${escapeHtml(item.reportTitle)}` : ''}</div>
                  </div>
                `
              }).join('')}
            `
            : '<div style="margin-top: 8px; color: #909399;">暂无报告贡献</div>'
          return `
            <div style="min-width: 240px; max-width: 360px; font-size: 12px; line-height: 1.6;">
              <div style="font-weight: 600; color: #303133;">${edge?.data?.label || '边'}</div>
              <div style="color: #606266;">${edge?.source || ''} → ${edge?.target || ''}</div>
              ${edge?.data?.analysisDate ? `<div style="color: #606266;">观察日期：${edge.data.analysisDate}（真实周期回填）</div>` : ''}
              <div style="margin-top: 6px; color: #303133; font-weight: 600;">当前线宽依据</div>
              <div style="margin-top: 4px; color: ${hasGrowth && growthYoy < 0 ? '#dc2626' : hasGrowth && growthYoy > 0 ? '#16a34a' : '#606266'};">
                ${hasGrowth ? formatYoy(growthYoy) : '暂无报告 YoY 贡献'}
              </div>
              ${edge?.data?.growthPeriod ? `<div style="color: #606266;">期间：${edge.data.growthPeriod}</div>` : ''}
              ${Number.isFinite(confidence) ? `<div style="color: #606266;">置信度：${(confidence * 100).toFixed(0)}%</div>` : ''}
              ${edge?.data?.growthCompanyName ? `<div style="color: #606266;">报告：${edge.data.growthCompanyName}《${edge.data.growthReportTitle || ''}》</div>` : ''}
              ${contributionHtml}
            </div>
          `
        },
      },
    ],
    behaviors: ['drag-canvas', 'zoom-canvas', 'drag-element'],
    animation: true,
  }
}
