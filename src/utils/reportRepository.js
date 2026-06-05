const extractedModules = import.meta.glob('@/data/reports/**/extracted.json', { eager: true })

const EDGE_GROWTH_METRICS = new Set([
  'revenue_growth_yoy_proxy',
  'demand_growth_signal',
])

function getModuleData(moduleValue) {
  return moduleValue?.default ?? moduleValue
}

function edgeKey(source, target) {
  return `${source}->${target}`
}

function comparePeriodDesc(a, b) {
  return String(b?.period || '').localeCompare(String(a?.period || ''))
}

function normalizeReportPackage(extracted) {
  const report = extracted.report || {}
  const reportId = report.id

  return {
    report,
    metrics: (extracted.metrics || []).map((metric) => ({
      ...metric,
      sourceReportId: reportId,
    })),
    graphSignals: (extracted.graphSignals || []).map((signal) => ({
      ...signal,
      sourceReportId: reportId,
    })),
    companySignals: (extracted.companySignals || []).map((signal) => ({
      ...signal,
      sourceReportId: reportId,
    })),
    timelineEvents: (extracted.timelineEvents || []).map((event) => ({
      relatedNodeIds: [],
      relatedCompanyIds: [],
      ...event,
      sourceReportId: event.sourceReportId || reportId,
    })),
  }
}

export const reportPackages = Object.values(extractedModules)
  .map(getModuleData)
  .filter(Boolean)
  .map(normalizeReportPackage)
  .sort((a, b) => String(b.report.publishedAt || '').localeCompare(String(a.report.publishedAt || '')))

export const reports = reportPackages.map((item) => item.report)

export const metrics = reportPackages.flatMap((item) =>
  item.metrics.map((metric) => ({ report: item.report, metric }))
)

export const graphSignals = reportPackages.flatMap((item) =>
  item.graphSignals.map((signal) => ({ report: item.report, signal }))
)

export const companySignals = reportPackages.flatMap((item) =>
  item.companySignals.map((signal) => ({ report: item.report, signal }))
)

export const timelineEvents = reportPackages
  .flatMap((item) =>
    item.timelineEvents.map((event) => ({
      ...event,
      sourceReport: item.report,
    }))
  )
  .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))

export const edgeGrowthSignals = graphSignals.filter(({ signal }) => {
  const target = signal.target || {}
  return target.type === 'edge' && EDGE_GROWTH_METRICS.has(signal.metric)
})

export const edgeGrowthByKey = edgeGrowthSignals.reduce((acc, item) => {
  const target = item.signal.target
  const key = edgeKey(target.source, target.target)
  if (!acc[key]) acc[key] = []
  acc[key].push(item)
  acc[key].sort((a, b) => {
    const confidenceDelta = (b.signal.confidence || 0) - (a.signal.confidence || 0)
    if (Math.abs(confidenceDelta) > 0.0001) return confidenceDelta
    return comparePeriodDesc(a.signal, b.signal)
  })
  return acc
}, {})

export const companySignalsById = companySignals.reduce((acc, item) => {
  const companyId = item.signal.companyId || item.report.companyId
  if (!companyId) return acc
  if (!acc[companyId]) acc[companyId] = []
  acc[companyId].push(item)
  acc[companyId].sort((a, b) => {
    const confidenceDelta = (b.signal.confidence || 0) - (a.signal.confidence || 0)
    if (Math.abs(confidenceDelta) > 0.0001) return confidenceDelta
    return comparePeriodDesc(a.signal, b.signal)
  })
  return acc
}, {})

export const companyWatchRows = Object.entries(companySignalsById)
  .map(([companyId, items]) => {
    const best = items[0]
    const report = best.report
    const signal = best.signal
    const fields = signal.fields || {}

    return {
      id: companyId,
      name: report.companyName || companyId,
      ticker: report.stockCode && report.exchange ? `${report.stockCode}.${report.exchange.replace('SZSE', 'SZ').replace('SSE', 'SH')}` : report.stockCode || '',
      layer: fields.layer || '',
      techRoute: fields.techRoute || '',
      stage: fields.stage || '',
      massProductionEta: fields.massProductionEta || '',
      keyCustomers: fields.keyCustomers || [],
      relatedNodeIds: fields.relatedNodeIds || [],
      confidence: signal.confidence,
      estimated: signal.estimated,
      method: signal.method,
      period: signal.period || report.period,
      sourceReportId: report.id,
      sourceReportTitle: report.title,
      sourcePublishedAt: report.publishedAt,
    }
  })
  .sort((a, b) => String(b.sourcePublishedAt || '').localeCompare(String(a.sourcePublishedAt || '')))

export function getBestEdgeGrowth(source, target) {
  return edgeGrowthByKey[edgeKey(source, target)]?.[0] || null
}

export function getBestCompanySignal(companyId) {
  return companySignalsById[companyId]?.[0] || null
}

export function getNodeSignals(nodeId) {
  return graphSignals.filter(({ signal }) => {
    const target = signal.target || {}
    return target.type === 'node' && target.id === nodeId
  })
}

export function getEdgeSignals(source, target) {
  return graphSignals.filter(({ signal }) => {
    const signalTarget = signal.target || {}
    return signalTarget.type === 'edge' && signalTarget.source === source && signalTarget.target === target
  })
}
