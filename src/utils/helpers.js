/**
 * 通用工具函数
 */

export const STATUS_TEXT = {
  RnD: '研发',
  sampling: '送样',
  mass_prod: '量产',
}

export const LAYER_TEXT = {
  chip: '芯片/晶圆',
  engine: '光引擎',
  module: '光模块/模组',
  system: '系统集成',
  cloud: '云/算力',
}

export const EVENT_TYPE_TEXT = {
  sampling: '送样',
  certification: '认证',
  yield: '良率突破',
  order: '订单',
  report: '报告',
  financial_report: '财报',
  other: '其他',
}

export const EVENT_TYPE_COLORS = {
  sampling: '#E6A23C',
  certification: '#67C23A',
  yield: '#409EFF',
  order: '#F56C6C',
  report: '#8B5CF6',
  financial_report: '#8B5CF6',
  other: '#909399',
}

/**
 * 导出为 CSV
 */
export function exportCSV(columns, rows, filename = 'export.csv') {
  const header = columns.map(c => c.title).join(',')
  const body = rows.map(row =>
    columns.map(c => {
      const val = row[c.key]
      // 包含逗号或引号时用引号包裹
      const str = String(val ?? '')
      return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str
    }).join(',')
  ).join('\n')

  const csv = '\uFEFF' + header + '\n' + body
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * 格式化日期
 */
export function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
