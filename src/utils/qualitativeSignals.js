export const QUALITATIVE_SIGNAL_TEXT = {
  demand_growth: '需求增长',
  capacity_expansion: '扩产',
  supply_constraint: '产能/供应瓶颈',
  long_term_order: '长单/锁单',
  new_product_ramp: '新品 ramp',
  technology_route: '技术路线',
  pricing_or_margin: '价格/毛利',
  customer_design_win: '客户导入',
  inventory_or_working_capital: '库存/营运资本',
  risk_or_uncertainty: '风险/不确定性',
}

export const QUALITATIVE_DIRECTION_TEXT = {
  positive: '未来增长',
  negative: '未来降低',
  neutral: '方向不明',
  mixed: '增长受约束',
}

export const QUALITATIVE_STRENGTH_TEXT = {
  strong: '强',
  medium: '中',
  weak: '弱',
  unknown: '未知',
}

export const QUALITATIVE_TIME_HORIZON_TEXT = {
  current_quarter: '当前季度',
  next_12_months: '未来 12 个月',
  multi_year: '多年',
  unknown: '未知',
}

export const QUALITATIVE_TONE = {
  growth: {
    key: 'growth',
    color: '#16a34a',
    softColor: '#dcfce7',
    borderColor: '#86efac',
    text: '未来增长',
    tagType: 'success',
  },
  decline: {
    key: 'decline',
    color: '#dc2626',
    softColor: '#fee2e2',
    borderColor: '#fca5a5',
    text: '未来降低',
    tagType: 'error',
  },
  neutral: {
    key: 'neutral',
    color: '#6b7280',
    softColor: '#f3f4f6',
    borderColor: '#d1d5db',
    text: '方向不明',
    tagType: 'default',
  },
}

const GROWTH_SIGNAL_TYPES = new Set([
  'demand_growth',
  'capacity_expansion',
  'supply_constraint',
  'long_term_order',
  'new_product_ramp',
  'customer_design_win',
])

export function qualitativeSignalTone(signal = {}) {
  if (signal.direction === 'negative') return QUALITATIVE_TONE.decline
  if (signal.direction === 'positive') return QUALITATIVE_TONE.growth
  if (GROWTH_SIGNAL_TYPES.has(signal.signalType)) return QUALITATIVE_TONE.growth
  return QUALITATIVE_TONE.neutral
}

export function isConstraintSignal(signal = {}) {
  return signal.signalType === 'supply_constraint'
    || signal.signalType === 'capacity_expansion'
    || (signal.direction === 'mixed' && qualitativeSignalTone(signal).key === 'growth')
}

export function summarizeQualitativeSignals(signals = []) {
  const growth = signals.filter((signal) => qualitativeSignalTone(signal).key === 'growth')
  const decline = signals.filter((signal) => qualitativeSignalTone(signal).key === 'decline')
  const neutral = signals.filter((signal) => qualitativeSignalTone(signal).key === 'neutral')
  const constraints = signals.filter(isConstraintSignal)
  const primaryTone = decline.length > 0
    ? QUALITATIVE_TONE.decline
    : growth.length > 0
      ? QUALITATIVE_TONE.growth
      : QUALITATIVE_TONE.neutral

  return {
    total: signals.length,
    growth: growth.length,
    decline: decline.length,
    neutral: neutral.length,
    constraints: constraints.length,
    primaryTone,
  }
}

export function signalTargetKey(target = {}) {
  if (target.type === 'edge') return `edge:${target.source}->${target.target}`
  if (target.type === 'node') return `node:${target.id}`
  if (target.type === 'company') return `company:${target.id}`
  return ''
}
