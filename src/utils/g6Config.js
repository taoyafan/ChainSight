import {
  getBestEdgeGrowthAsOf,
  getEdgeGrowthSignalsAsOf,
  getEdgeQualitativeSignals,
  getNodeQualitativeSignals,
} from '@/utils/reportRepository'
import { summarizeQualitativeSignals } from '@/utils/qualitativeSignals'

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
  chip: '芯片/晶圆',
  engine: '光引擎',
  module: '光模块/模组',
  system: '系统集成',
  cloud: '云/算力',
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
const COLLAPSE_BADGE_STYLE = {
  placement: 'right-top',
  offsetX: 8,
  offsetY: -8,
  fontSize: 18,
  fontWeight: 700,
  fill: '#fff',
  backgroundFill: '#409EFF',
  backgroundStroke: '#409EFF',
  backgroundLineWidth: 1,
  backgroundRadius: 12,
  padding: [2, 8, 2, 8],
  cursor: 'pointer',
}
const QUALITATIVE_NODE_BADGE_STYLE = {
  placement: 'right-bottom',
  offsetX: 8,
  offsetY: 8,
  fontSize: 12,
  fontWeight: 700,
  fill: '#fff',
  backgroundLineWidth: 1,
  backgroundRadius: 11,
  padding: [2, 7, 2, 7],
}

function formatYoy(value) {
  if (!Number.isFinite(value)) return '暂无 YoY 数据'
  const sign = value > 0 ? '+' : ''
  return `${sign}${(value * 100).toFixed(1)}% YoY`
}

function formatYoyLabel(value) {
  if (!Number.isFinite(value)) return ''
  const sign = value > 0 ? '+' : ''
  return `${sign}${(value * 100).toFixed(0)}%`
}

function formatQualitativeBadge(summary) {
  if (!summary?.total) return ''
  return summary.constraints > 0 ? `${summary.total}!` : String(summary.total)
}

function qualitativeTooltipLine(summary) {
  if (!summary?.total) return ''
  const parts = []
  if (summary.growth) parts.push(`未来增长 ${summary.growth}`)
  if (summary.decline) parts.push(`未来降低 ${summary.decline}`)
  if (summary.neutral) parts.push(`方向不明 ${summary.neutral}`)
  if (summary.constraints) parts.push(`约束 ${summary.constraints}`)
  return parts.join(' / ')
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
  const visibleNodeIds = new Set(nodes.map(n => n.id))
  const showOpticalModuleCombo =
    !visibleNodeIds.has('optical_module') &&
    visibleNodeIds.has('eml_pluggable_module') &&
    visibleNodeIds.has('silicon_photonic_pluggable_module')

  const g6Nodes = nodes.map(n => {
    const qualitativeItems = getNodeQualitativeSignals(n.id)
    const qualitativeSummary = summarizeQualitativeSignals(qualitativeItems.map((item) => item.signal))
    return {
      id: n.id,
      combo: showOpticalModuleCombo && (
        n.id === 'eml_pluggable_module' || n.id === 'silicon_photonic_pluggable_module'
      ) ? 'optical_module_combo' : undefined,
      data: {
        label: n.label,
        layer: n.layer,
        status: n.status,
        bottleneck: n.bottleneck,
        bottleneckNote: n.bottleneckNote,
        marketSizeHint: n.marketSizeHint,
        collapseControl: n.id === 'optical_module' ? '+' : '',
        qualitativeCount: qualitativeSummary.total,
        qualitativeSummary,
      },
    }
  })

  const g6Edges = edges.map((e, i) => {
    const growthEvidence = getBestEdgeGrowthAsOf(e.source, e.target, analysisDate)
    const growthContributions = getEdgeGrowthSignalsAsOf(e.source, e.target, analysisDate)
      .filter(({ signal }) => EDGE_GROWTH_METRICS.has(signal.metric))
      .map(toGrowthContribution)
    const growthValue = growthEvidence?.signal?.value
    const growthStyle = getGrowthEdgeStyle(growthValue)
    const qualitativeItems = getEdgeQualitativeSignals(e.source, e.target)
    const qualitativeSummary = summarizeQualitativeSignals(qualitativeItems.map((item) => item.signal))

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
        qualitativeCount: qualitativeSummary.total,
        qualitativeSummary,
        qualitativeBadgeText: formatQualitativeBadge(qualitativeSummary),
        qualitativeBadgeColor: qualitativeSummary.primaryTone.color,
        qualitativeBadgeFill: qualitativeSummary.primaryTone.softColor,
        qualitativeBadgeStroke: qualitativeSummary.primaryTone.borderColor,
        qualitativeTooltipLine: qualitativeTooltipLine(qualitativeSummary),
        analysisDate,
        label: e.label,
      },
    }
  })

  const combos = showOpticalModuleCombo
    ? [{
        id: 'optical_module_combo',
        data: { label: '光模块', collapseControl: '-' },
      }]
    : []

  return { nodes: g6Nodes, edges: g6Edges, combos }
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
          const baseWidth = (SIZE_MAP[d.data?.marketSizeHint] || 80) + 90
          const labelWidth = 96 + String(d.data?.label || d.id || '').length * 14
          return [Math.min(340, Math.max(baseWidth, labelWidth)), 78]
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
        badges: (d) => {
          const badges = []
          if (d.data?.collapseControl) badges.push({ ...COLLAPSE_BADGE_STYLE, text: d.data.collapseControl })
          if (d.data?.qualitativeCount) {
            badges.push({
              ...QUALITATIVE_NODE_BADGE_STYLE,
              text: formatQualitativeBadge(d.data.qualitativeSummary),
              backgroundFill: d.data.qualitativeSummary.primaryTone.color,
              backgroundStroke: d.data.qualitativeSummary.primaryTone.color,
            })
          }
          return badges
        },
        badgePalette: false,
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
    combo: {
      type: 'rect',
      style: {
        padding: [38, 34, 34, 34],
        radius: 8,
        fill: 'rgba(64,158,255,0.04)',
        stroke: '#409EFF',
        lineDash: [8, 6],
        lineWidth: 2,
        labelText: (d) => d.data?.label || d.id,
        labelPlacement: 'top',
        labelFill: '#2563eb',
        labelFontSize: 18,
        labelFontWeight: 600,
        labelBackground: true,
        labelBackgroundFill: '#fff',
        labelBackgroundOpacity: 0.9,
        labelBackgroundRadius: 4,
        badges: (d) => d.data?.collapseControl
          ? [{ ...COLLAPSE_BADGE_STYLE, text: d.data.collapseControl }]
          : [],
        badgePalette: false,
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
        labelText: (d) => formatYoyLabel(d.data?.growthYoy),
        labelFill: '#909399',
        labelFontSize: 14,
        labelBackground: (d) => Number.isFinite(d.data?.growthYoy),
        labelBackgroundFill: '#fff',
        labelBackgroundOpacity: 0.85,
        labelBackgroundRadius: 3,
        badgeText: (d) => d.data?.qualitativeBadgeText || '',
        badgeFill: (d) => d.data?.qualitativeBadgeColor || '#6b7280',
        badgeFontSize: 12,
        badgeFontWeight: 700,
        badgeBackgroundFill: (d) => d.data?.qualitativeBadgeFill || '#f3f4f6',
        badgeBackgroundStroke: (d) => d.data?.qualitativeBadgeStroke || '#d1d5db',
        badgeBackgroundLineWidth: 1,
        badgeBackgroundRadius: 10,
        badgePadding: [2, 6, 2, 6],
        badgePlacement: 'suffix',
        badgeOffsetX: 4,
        badgeOffsetY: -12,
      },
      state: {
        highlight: {
          opacity: 1,
          lineWidth: (d) => d.data?.lineWidth || MIN_EDGE_WIDTH,
        },
        dim: {
          opacity: 0.15,
          lineWidth: (d) => d.data?.lineWidth || MIN_EDGE_WIDTH,
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
          return `
            <div style="min-width: 180px; max-width: 240px; font-size: 12px; line-height: 1.55;">
              <div style="font-weight: 600; color: #303133;">${edge?.data?.label || '边'}</div>
              <div style="margin-top: 4px; color: ${hasGrowth && growthYoy < 0 ? '#dc2626' : hasGrowth && growthYoy > 0 ? '#16a34a' : '#606266'};">
                ${hasGrowth ? formatYoy(growthYoy) : '暂无报告 YoY 贡献'}
              </div>
              <div style="color: #909399;">
                ${edge?.data?.growthPeriod ? `${escapeHtml(edge.data.growthPeriod)} · ` : ''}
                ${Number.isFinite(confidence) ? `置信度 ${(confidence * 100).toFixed(0)}%` : '双击查看详情'}
              </div>
              ${edge?.data?.qualitativeCount ? `
                <div style="margin-top: 6px; color: ${edge.data.qualitativeBadgeColor};">
                  文字信号 ${edge.data.qualitativeCount} 条${edge.data.qualitativeTooltipLine ? ` · ${escapeHtml(edge.data.qualitativeTooltipLine)}` : ''}
                </div>
              ` : ''}
            </div>
          `
        },
      },
    ],
    behaviors: ['drag-canvas', 'zoom-canvas', 'drag-element'],
    animation: false,
  }
}
