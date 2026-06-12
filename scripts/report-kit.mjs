#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const dataRoot = path.join(root, 'src', 'data')
const reportsRoot = path.join(dataRoot, 'reports')
const taxonomyRoot = path.join(dataRoot, 'taxonomy')
const rulesPath = path.join(root, 'scripts', 'confidence-rules.json')

const command = process.argv[2]
const argv = parseArgs(process.argv.slice(3))

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})

async function main() {
  if (!command || argv.help || argv.h) {
    printHelp()
    return
  }

  if (command === 'score-confidence') {
    const result = scoreConfidence(argv)
    printJson(result)
    return
  }

  if (command === 'process-extraction') {
    processExtraction()
    return
  }

  if (command === 'process-mapping') {
    processMapping()
    return
  }

  if (command === 'audit-topology') {
    auditTopology()
    return
  }

  if (command === 'validate-reports') {
    validateReports()
    return
  }

  throw new Error(`Unknown command: ${command}`)
}

function auditTopology() {
  const audits = []

  if (argv['split-node']) {
    const { oldId, newIds } = parseSplit(argv['split-node'])
    audits.push({ type: 'split-node', oldId, newIds })
  }
  if (argv.node) audits.push({ type: 'node', oldId: argv.node, newIds: [] })

  if (argv['split-edge']) {
    const { oldId, newIds } = parseSplit(argv['split-edge'])
    validateEdgeKey(oldId)
    for (const next of newIds) validateEdgeKey(next)
    audits.push({ type: 'split-edge', oldId, newIds })
  }
  if (argv.edge) {
    validateEdgeKey(argv.edge)
    audits.push({ type: 'edge', oldId: normalizeEdgeKey(argv.edge), newIds: [] })
  }

  if (audits.length === 0) {
    throw new Error('Provide --split-node, --node, --split-edge, or --edge.')
  }

  const findings = []
  const reportFiles = findFiles(reportsRoot, 'extracted.json')

  for (const audit of audits) {
    validateAuditTargets(audit)
    for (const file of reportFiles) {
      const extracted = JSON.parse(fs.readFileSync(file, 'utf8'))
      const hits = findExtractedHits(extracted, audit)
      if (hits.length > 0) {
        findings.push({
          audit,
          file: relative(file),
          reportId: extracted.report?.id,
          needsReview: true,
          hits
        })
      }
    }
  }

  if (argv.json) {
    printJson({ findings })
    return
  }

  if (findings.length === 0) {
    console.log('No affected report files found.')
    return
  }

  console.log(`Affected files: ${findings.length}`)
  for (const finding of findings) {
    console.log(`\n- ${finding.file}`)
    if (finding.reportId) console.log(`  report: ${finding.reportId}`)
    console.log(`  audit: ${describeAudit(finding.audit)}`)
    for (const hit of finding.hits) {
      console.log(`  - ${hit.path}: ${hit.reason}`)
    }
  }
}

function validateReports() {
  const nodes = loadNodes()
  const edges = loadEdges()
  const nodeIds = new Set(nodes.map((node) => node.id))
  const edgeIds = new Set(edges.map((edge) => edgeKey(edge.source, edge.target)))
  const errors = []

  collectTextPlaceholderErrors(nodes, 'src/data/taxonomy/nodes.json', errors)
  collectTextPlaceholderErrors(edges, 'src/data/taxonomy/edges.json', errors)

  for (const node of nodes) {
    if (Object.prototype.hasOwnProperty.call(node, 'companies')) {
      errors.push(`src/data/taxonomy/nodes.json node ${node.id} must not contain companies; use report-derived companySignals instead`)
    }
  }

  for (const edge of edges) {
    if (!nodeIds.has(edge.source)) errors.push(`taxonomy edge source missing: ${edge.source}`)
    if (!nodeIds.has(edge.target)) errors.push(`taxonomy edge target missing: ${edge.target}`)
  }

  for (const file of findFiles(reportsRoot, 'extracted.json')) {
    const extracted = JSON.parse(fs.readFileSync(file, 'utf8'))
    collectTextPlaceholderErrors(extracted, relative(file), errors)
    walk(extracted, (value, pointer) => {
      if (!value || typeof value !== 'object') return
      if (value.target?.type === 'node' && !nodeIds.has(value.target.id)) {
        errors.push(`${relative(file)} ${pointer}.target missing node ${value.target.id}`)
      }
      if (value.target?.type === 'edge') {
        const key = edgeKey(value.target.source, value.target.target)
        if (!edgeIds.has(key)) errors.push(`${relative(file)} ${pointer}.target missing edge ${key}`)
      }
      if (Array.isArray(value.relatedNodeIds)) {
        for (const id of value.relatedNodeIds) {
          if (!nodeIds.has(id)) errors.push(`${relative(file)} ${pointer}.relatedNodeIds missing node ${id}`)
        }
      }
    })
  }

  if (errors.length > 0) {
    console.error(errors.join('\n'))
    process.exit(1)
  }
  console.log('references ok')
}

function collectTextPlaceholderErrors(value, label, errors) {
  walk(value, (item, pointer) => {
    if (typeof item === 'string' && /\?{2,}/.test(item)) {
      errors.push(`${label} ${pointer} contains question-mark placeholder text: ${item}`)
    }
  })
}

function processExtraction() {
  const inputPath = argv.input || argv.file || argv._[0]
  if (!inputPath) throw new Error('Missing extraction input path.')

  const inputFile = path.resolve(root, inputPath)
  const input = JSON.parse(fs.readFileSync(inputFile, 'utf8'))
  validateExtractionInput(input)
  warnMissingOutgoingEdgeInputs(input)

  const extracted = deriveExtracted(input)
  const year = String(extracted.report.publishedAt).slice(0, 4)
  const outDir = argv['out-dir']
    ? path.resolve(root, argv['out-dir'])
    : path.join(reportsRoot, year, extracted.report.id)
  const extractedPath = path.join(outDir, 'extracted.json')
  if (fs.existsSync(extractedPath) && !argv.force) {
    throw new Error(`${relative(extractedPath)} already exists. Use --force to overwrite.`)
  }

  fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(extractedPath, `${JSON.stringify(extracted, null, 2)}\n`, 'utf8')
  console.log(`processed ${relative(inputFile)}`)
  console.log(`created ${relative(extractedPath)}`)
}

function processMapping() {
  const inputPath = argv.input || argv.file || argv._[0]
  if (!inputPath) throw new Error('Missing mapping input path.')

  const inputFile = path.resolve(root, inputPath)
  const input = JSON.parse(fs.readFileSync(inputFile, 'utf8'))
  const factsPath = argv.facts
    ? path.resolve(root, argv.facts)
    : path.join(path.dirname(inputFile), 'facts.json')
  const facts = fs.existsSync(factsPath)
    ? JSON.parse(fs.readFileSync(factsPath, 'utf8'))
    : null

  validateMappingInput(input, facts)
  const processed = deriveProcessedMapping(input, facts)
  const outPath = argv.output
    ? path.resolve(root, argv.output)
    : path.join(path.dirname(inputFile), 'extracted.json')
  if (fs.existsSync(outPath) && !argv.force) {
    throw new Error(`${relative(outPath)} already exists. Use --force to overwrite.`)
  }

  fs.writeFileSync(outPath, `${JSON.stringify(processed, null, 2)}\n`, 'utf8')
  console.log(`processed ${relative(inputFile)}`)
  console.log(`created ${relative(outPath)}`)
}

function validateMappingInput(input, facts) {
  const errors = []
  const allowed = loadTemplateAllowedValues()
  const nodeIds = new Set(loadNodes().map((node) => node.id))
  const edgeIds = new Set(loadEdges().map((edge) => edgeKey(edge.source, edge.target)))
  const factIds = new Set((facts?.reportedItems || []).map((item) => item.id))
  const metricIds = new Set((facts?.financialMetrics || []).map((item) => item.id))

  if (!input.reportId) errors.push('reportId is required')
  const seenProducts = new Set()
  for (const [index, product] of (input.productNodes || []).entries()) {
    const pointer = `productNodes[${index}]`
    if (!product.nodeId) errors.push(`${pointer}.nodeId is required`)
    else if (!nodeIds.has(product.nodeId)) errors.push(`${pointer}.nodeId unknown node ${product.nodeId}`)
    if (product.nodeId && seenProducts.has(product.nodeId)) errors.push(`${pointer}.nodeId duplicates ${product.nodeId}`)
    seenProducts.add(product.nodeId)

    const coverage = product.coverage || {}
    if (!coverage.commercializationType) errors.push(`${pointer}.coverage.commercializationType is required`)
    else if (!isAllowed(allowed, 'commercializationType', coverage.commercializationType)) {
      errors.push(`${pointer}.coverage.commercializationType invalid: ${coverage.commercializationType}`)
    }
    validateFactIds(coverage.factIds, factIds, facts, errors, `${pointer}.coverage.factIds`)
    if (coverage.evidenceText == null) errors.push(`${pointer}.coverage.evidenceText is required`)

    if (coverage.commercializationType === 'external_sales') {
      if (!product.financial) errors.push(`${pointer}.financial is required for external_sales`)
      else validateMappingFinancial(product.financial, { allowed, metricIds, facts, errors }, `${pointer}.financial`)
    }
  }
  validateHierarchyCompleteness([...seenProducts], nodeIds, errors, 'productNodes.nodeId')

  const seenDownstream = new Set()
  const downstreamNodeIds = new Set()
  for (const [index, item] of (input.downstreamAttributions || []).entries()) {
    const pointer = `downstreamAttributions[${index}]`
    if (!item.downstreamNodeId) errors.push(`${pointer}.downstreamNodeId is required`)
    else if (!nodeIds.has(item.downstreamNodeId)) errors.push(`${pointer}.downstreamNodeId unknown node ${item.downstreamNodeId}`)
    if (item.downstreamNodeId) downstreamNodeIds.add(item.downstreamNodeId)
    if (item.sourceProductNodeId != null && !nodeIds.has(item.sourceProductNodeId)) {
      errors.push(`${pointer}.sourceProductNodeId unknown node ${item.sourceProductNodeId}`)
    }
    const key = `${item.sourceProductNodeId || '*'}->${item.downstreamNodeId || '?'}`
    if (seenDownstream.has(key)) errors.push(`${pointer} duplicates attribution ${key}`)
    seenDownstream.add(key)
    validateFactIds(item.factIds, factIds, facts, errors, `${pointer}.factIds`)
    validateMappingAttribution(item, { allowed, metricIds, facts, errors }, pointer)
  }
  validateHierarchyCompleteness([...downstreamNodeIds], nodeIds, errors, 'downstreamAttributions.downstreamNodeId')

  for (const product of input.productNodes || []) {
    if (product.coverage?.commercializationType !== 'external_sales') continue
    const outgoing = loadEdges().filter((edge) => edge.source === product.nodeId)
    for (const edge of outgoing) {
      if (!seenDownstream.has(`${product.nodeId}->${edge.target}`) && !seenDownstream.has(`*->${edge.target}`)) {
        errors.push(`missing downstream attribution for auto edge ${edgeKey(edge.source, edge.target)}`)
      }
      if (!edgeIds.has(edgeKey(edge.source, edge.target))) errors.push(`unknown taxonomy edge ${edgeKey(edge.source, edge.target)}`)
    }
  }

  if (errors.length > 0) throw new Error(errors.join('\n'))
}

function validateHierarchyCompleteness(ids, nodeIds, errors, pointer) {
  const nodes = loadNodes()
  const childrenByParent = new Map()
  const parentByChild = new Map()
  for (const node of nodes) {
    if (!node.parentId) continue
    if (!childrenByParent.has(node.parentId)) childrenByParent.set(node.parentId, [])
    childrenByParent.get(node.parentId).push(node.id)
    parentByChild.set(node.id, node.parentId)
  }

  const selected = new Set(ids.filter((id) => nodeIds.has(id)))
  const required = new Set()

  for (const id of selected) {
    if (childrenByParent.has(id)) {
      required.add(id)
      for (const childId of childrenByParent.get(id)) required.add(childId)
    }
    const parentId = parentByChild.get(id)
    if (parentId) {
      required.add(parentId)
      for (const siblingId of childrenByParent.get(parentId) || []) required.add(siblingId)
    }
  }

  for (const id of required) {
    if (!selected.has(id)) {
      errors.push(`${pointer} hierarchy incomplete: missing ${id}`)
    }
  }
}

function validateMappingFinancial(item, { allowed, metricIds, facts, errors }, pointer) {
  for (const field of ['period', 'growthMetricId', 'growthValueType', 'revenueScope', 'scopeLabel', 'shareOfScope', 'managementAttribution', 'sourceMetricIds']) {
    if (item[field] == null || item[field] === '') errors.push(`${pointer}.${field} is required`)
  }
  if (item.notes == null) errors.push(`${pointer}.notes is required`)
  if (facts && item.growthMetricId && !metricIds.has(item.growthMetricId)) errors.push(`${pointer}.growthMetricId unknown metric ${item.growthMetricId}`)
  validateMetricIds(item.sourceMetricIds, metricIds, facts, errors, `${pointer}.sourceMetricIds`)
  if (!isAllowed(allowed, 'growthValueType', item.growthValueType)) errors.push(`${pointer}.growthValueType invalid: ${item.growthValueType}`)
  if (!isAllowed(allowed, 'revenueScope', item.revenueScope)) errors.push(`${pointer}.revenueScope invalid: ${item.revenueScope}`)
  validateMappingAttribution(item, { allowed, metricIds, facts, errors }, pointer)
  if (item.growthValueType === 'not_disclosed' && item.growthValue !== null) errors.push(`${pointer}.growthValue must be null when growthValueType is not_disclosed`)
  if (item.growthValueType === 'yoy_ratio' && !Number.isFinite(item.growthValue)) errors.push(`${pointer}.growthValue must be a number for yoy_ratio`)
}

function validateMappingAttribution(item, { allowed, metricIds, facts, errors }, pointer) {
  if (!isAllowed(allowed, 'shareOfScope', item.shareOfScope)) errors.push(`${pointer}.shareOfScope invalid: ${item.shareOfScope}`)
  if (!isAllowed(allowed, 'managementAttribution', item.managementAttribution)) errors.push(`${pointer}.managementAttribution invalid: ${item.managementAttribution}`)
  if (item.managementAttribution !== 'not_mentioned' && !item.attributionEvidenceText) {
    errors.push(`${pointer}.attributionEvidenceText is required when managementAttribution is ${item.managementAttribution}`)
  }
  validateMetricIds(item.sourceMetricIds, metricIds, facts, errors, `${pointer}.sourceMetricIds`)
}

function validateFactIds(ids, factIds, facts, errors, pointer) {
  if (!Array.isArray(ids)) {
    errors.push(`${pointer} must be an array`)
    return
  }
  if (!facts) return
  for (const id of ids) {
    if (!factIds.has(id)) errors.push(`${pointer} unknown fact ${id}`)
  }
}

function validateMetricIds(ids, metricIds, facts, errors, pointer) {
  if (!Array.isArray(ids)) {
    errors.push(`${pointer} must be an array`)
    return
  }
  if (!facts) return
  for (const id of ids) {
    if (!metricIds.has(id)) errors.push(`${pointer} unknown metric ${id}`)
  }
}

function deriveProcessedMapping(input, facts) {
  if (!facts?.report) throw new Error('process-mapping requires facts.json with report metadata.')
  const report = stripPrivate(facts.report)
  const products = stripPrivate(input.productNodes || [])
  const downstreamAttributions = stripPrivate(input.downstreamAttributions || [])
  const downstreamByKey = new Map(downstreamAttributions.map((item) => [
    downstreamAttributionKey(item.sourceProductNodeId, item.downstreamNodeId),
    item
  ]))
  const graphSignals = []
  const productNodeSignals = []
  const downstreamSignals = downstreamAttributions.map((item) => {
    const confidence = scoreConfidence({
      'share-of-scope': item.shareOfScope,
      'management-attribution': item.managementAttribution
    })
    return {
      downstreamNodeId: item.downstreamNodeId,
      sourceProductNodeId: item.sourceProductNodeId ?? null,
      confidence: confidence.confidence,
      confidenceModel: confidence.model,
      confidenceFactors: confidence.factors,
      factIds: item.factIds || [],
      sourceMetricIds: item.sourceMetricIds || [],
      supportingContext: buildMappingAttributionContext(item)
    }
  })

  for (const product of products) {
    const financial = product.financial
    if (product.coverage?.commercializationType !== 'external_sales' || !financial || !Number.isFinite(financial.growthValue)) {
      continue
    }
    const nodeConfidence = scoreConfidence({
      'share-of-scope': financial.shareOfScope,
      'management-attribution': financial.managementAttribution
    })
    const nodeSignal = deriveMappingProductNodeSignal(input, product, financial, nodeConfidence)
    productNodeSignals.push(nodeSignal)
    graphSignals.push(nodeSignal)

    for (const edge of loadEdges().filter((item) => item.source === product.nodeId)) {
      const downstream = downstreamByKey.get(downstreamAttributionKey(product.nodeId, edge.target))
        || downstreamByKey.get(downstreamAttributionKey(null, edge.target))
      if (!downstream) continue
      const downstreamConfidence = scoreConfidence({
        'share-of-scope': downstream.shareOfScope,
        'management-attribution': downstream.managementAttribution
      })
      const finalConfidence = roundConfidence(nodeConfidence.confidence * downstreamConfidence.confidence)
      if (finalConfidence <= 0) continue
      graphSignals.push(deriveMappingEdgeSignal(input, product, financial, edge, downstream, nodeConfidence, downstreamConfidence, finalConfidence))
    }
  }

  const relatedNodeIds = unique([
    ...products.map((item) => item.nodeId),
    ...downstreamAttributions.map((item) => item.downstreamNodeId),
    ...graphSignals.flatMap((signal) => targetNodeIds(signal.target))
  ])
  const coverage = deriveCoverageFromMapping(report, products)
  const growthInputs = deriveGrowthInputsFromMapping(input, products, graphSignals)
  const companySignal = {
    id: `${slug(report.companyId)}-${slug(report.period)}-company-watch-profile`,
    companyId: report.companyId,
    period: report.period,
    fields: {
      layer: '',
      techRoute: '',
      keyCustomers: [],
      relatedNodeIds: unique(coverage.map((item) => item.productNodeId))
    },
    estimated: true,
    confidence: 1,
    method: 'derived_from_mapping_product_coverage',
    sourceMetricIds: unique(growthInputs.flatMap((item) => item.sourceMetricIds || []))
  }

  return {
    report,
    metrics: deriveFinancialMetrics(facts.financialMetrics || [], report),
    productCategoryMetrics: [],
    graphSignals,
    companySignals: [companySignal],
    timelineEvents: [{
      id: `${slug(report.companyId)}-${slug(report.period)}-report-published`,
      date: report.publishedAt,
      type: 'financial_report',
      title: `${report.companyName}发布 ${report.title}`,
      summary: `${report.companyName}发布${report.period}报告。`,
      relatedNodeIds,
      relatedCompanyIds: [report.companyId],
      sourceReportId: report.id
    }],
    companyProductCoverage: coverage,
    productGrowthInputs: growthInputs,
    products: [],
    mapping: {
      productNodes: products,
      downstreamAttributions: stripPrivate(downstreamAttributions),
      productNodeSignals,
      downstreamSignals
    },
    notes: {}
  }
}

function deriveCoverageFromMapping(report, products) {
  return products.map((product) => ({
    companyId: report.companyId,
    productNodeId: product.nodeId,
    coverageEvidenceType: 'current_report',
    coverageSource: report.title,
    evidenceText: product.coverage?.evidenceText || '',
    isRevenueProduct: product.coverage?.commercializationType === 'external_sales',
    commercializationType: product.coverage?.commercializationType || '',
    notes: product.coverage?.notes || ''
  }))
}

function deriveGrowthInputsFromMapping(input, products, graphSignals) {
  const byTarget = new Map(graphSignals.map((signal) => {
    const target = signal.target || {}
    const key = target.type === 'edge'
      ? `edge:${target.source}->${target.target}`
      : `node:${target.id}`
    return [key, signal]
  }))
  const result = []
  for (const product of products) {
    const financial = product.financial
    if (!financial) continue
    const nodeSignal = byTarget.get(`node:${product.nodeId}`)
    result.push({
      ...financial,
      id: `${slug(input.reportId)}-${product.nodeId}-node-growth-input`,
      productNodeId: product.nodeId,
      graphTarget: { type: 'node', id: product.nodeId },
      confidence: nodeSignal?.confidence
    })
    for (const signal of graphSignals) {
      const target = signal.target || {}
      if (target.type !== 'edge' || target.source !== product.nodeId) continue
      result.push({
        ...financial,
        id: `${slug(input.reportId)}-${product.nodeId}-to-${target.target}-growth-input`,
        productNodeId: product.nodeId,
        graphTarget: { type: 'edge', source: product.nodeId, target: target.target },
        confidence: signal.confidence
      })
    }
  }
  return result
}

function deriveMappingProductNodeSignal(input, product, financial, confidence) {
  return {
    id: `${slug(input.reportId)}-${product.nodeId}-node-growth`,
    target: { type: 'node', id: product.nodeId },
    metric: 'revenue_growth_yoy_proxy',
    value: financial.growthValue,
    unit: financial.growthValueType,
    period: financial.period,
    estimated: true,
    confidence: confidence.confidence,
    method: 'derived_from_mapping_product_node',
    derived: true,
    derivedFrom: `${input.reportId}:${product.nodeId}:${financial.period}`,
    confidenceModel: confidence.model,
    confidenceFactors: confidence.factors,
    sourceMetricIds: financial.sourceMetricIds,
    supportingContext: buildFinancialSupportingContext(financial)
  }
}

function deriveMappingEdgeSignal(input, product, financial, edge, downstream, nodeConfidence, downstreamConfidence, confidence) {
  return {
    id: `${slug(input.reportId)}-${product.nodeId}-to-${edge.target}-growth`,
    target: { type: 'edge', source: product.nodeId, target: edge.target },
    metric: 'revenue_growth_yoy_proxy',
    value: financial.growthValue,
    unit: financial.growthValueType,
    period: financial.period,
    estimated: true,
    confidence,
    method: 'derived_from_product_node_and_downstream_attribution',
    derived: true,
    derivedFrom: `${input.reportId}:${product.nodeId}:${financial.period}`,
    confidenceModel: 'product_node_confidence_x_downstream_attribution_confidence',
    confidenceFactors: {
      productNode: nodeConfidence.factors,
      downstreamAttribution: downstreamConfidence.factors
    },
    sourceMetricIds: unique([...(financial.sourceMetricIds || []), ...(downstream.sourceMetricIds || [])]),
    supportingContext: [
      ...buildFinancialSupportingContext(financial),
      ...buildMappingAttributionContext(downstream)
    ]
  }
}

function buildMappingAttributionContext(item) {
  return [
    {
      source: 'downstream_attribution',
      metric: item.managementAttribution,
      value: item.attributionEvidenceText || '未提及',
      unit: 'text'
    },
    {
      source: 'downstream_share_of_scope',
      metric: item.shareOfScope,
      value: item.notes || '',
      unit: 'text'
    }
  ]
}

function downstreamAttributionKey(sourceProductNodeId, downstreamNodeId) {
  return `${sourceProductNodeId || '*'}->${downstreamNodeId}`
}

function loadTemplateAllowedValues() {
  const templatePath = path.join(reportsRoot, 'templates', 'report-extraction.template.json')
  if (!fs.existsSync(templatePath)) return {}
  const template = JSON.parse(fs.readFileSync(templatePath, 'utf8'))
  return template._allowedValues || {}
}

function isAllowed(allowed, key, value) {
  const values = allowed[key]
  if (!Array.isArray(values) || values.length === 0) return true
  return values.includes(value)
}

function validateExtractionInput(input) {
  const errors = []
  const allowed = loadTemplateAllowedValues()
  const report = input.report || {}
  const requiredReportFields = ['id', 'companyId', 'companyName', 'title', 'type', 'period', 'periodStart', 'periodEnd', 'publishedAt', 'currency', 'sources']
  for (const field of requiredReportFields) {
    if (report[field] == null || report[field] === '') errors.push(`report.${field} is required`)
  }

  const companyIds = new Set(loadCompanies().map((company) => company.id))
  if (report.companyId && !companyIds.has(report.companyId)) errors.push(`unknown companyId: ${report.companyId}`)

  const nodeIds = new Set(loadNodes().map((node) => node.id))
  const edgeIds = new Set(loadEdges().map((edge) => edgeKey(edge.source, edge.target)))
  const metrics = input.metrics || []
  const metricIds = new Set(metrics.map((metric) => metric.id))
  for (const metric of metrics) {
    for (const field of ['id', 'label', 'value', 'unit', 'period']) {
      if (metric[field] == null || metric[field] === '') errors.push(`metrics.${metric.id || '?'} ${field} is required`)
    }
  }

  for (const item of input.productCategoryMetrics || []) {
    for (const field of ['id', 'categoryName', 'period', 'unit', 'sourceSection', 'sourceText', 'mappedNodeIds', 'notes']) {
      if (item[field] == null || item[field] === '') errors.push(`productCategoryMetrics.${item.id || '?'} ${field} is required`)
    }
    for (const field of ['revenue', 'operatingCost', 'grossProfit', 'grossMargin', 'revenueYoy', 'operatingCostYoy', 'grossProfitYoy', 'grossMarginChangePpt']) {
      if (item[field] != null && !Number.isFinite(item[field])) errors.push(`productCategoryMetrics.${item.id || '?'} ${field} must be a number or null`)
    }
    for (const nodeId of item.mappedNodeIds || []) {
      if (!nodeIds.has(nodeId)) errors.push(`productCategoryMetrics.${item.id || '?'} unknown mappedNodeId: ${nodeId}`)
    }
  }

  if (Array.isArray(input.products) && input.products.length > 0) {
    validateProducts(input, { allowed, nodeIds, edgeIds, metricIds, errors })
  } else {
    validateLegacyProductFields(input, { allowed, nodeIds, edgeIds, metricIds, errors })
  }

  if (errors.length > 0) {
    throw new Error(errors.join('\n'))
  }
}

function validateLegacyProductFields(input, { allowed, nodeIds, edgeIds, metricIds, errors }) {
  const coverage = input.companyProductCoverage || []
  const coverageKeys = new Set()
  for (const item of coverage) {
    for (const field of ['companyId', 'productNodeId', 'coverageEvidenceType', 'coverageSource', 'evidenceText', 'isRevenueProduct', 'notes']) {
      if (item[field] == null || item[field] === '') errors.push(`companyProductCoverage.${item.productNodeId || '?'} ${field} is required`)
    }
    validateNoTaxonomyEvidence(item.coverageSource, errors, `companyProductCoverage.${item.productNodeId || '?'}.coverageSource`)
    validateNoTaxonomyEvidence(item.evidenceText, errors, `companyProductCoverage.${item.productNodeId || '?'}.evidenceText`)
    if (item.productNodeId && !nodeIds.has(item.productNodeId)) errors.push(`unknown productNodeId: ${item.productNodeId}`)
    if (!isAllowed(allowed, 'coverageEvidenceType', item.coverageEvidenceType)) errors.push(`invalid coverageEvidenceType: ${item.coverageEvidenceType}`)
    coverageKeys.add(`${item.companyId}:${item.productNodeId}`)
  }

  const growthInputs = input.productGrowthInputs || []
  for (const item of growthInputs) {
    validateProductGrowthInput(item, { allowed, metricIds, errors }, `productGrowthInputs.${item.id || item.productNodeId || '?'}`)
    if (!coverageKeys.has(`${item.companyId}:${item.productNodeId}`)) {
      errors.push(`productGrowthInputs.${item.id || item.productNodeId} productNodeId is not covered by companyProductCoverage`)
    }
    validateGraphTarget(item.graphTarget, nodeIds, edgeIds, errors, `productGrowthInputs.${item.id || item.productNodeId}.graphTarget`)
  }
}

function validateProducts(input, { allowed, nodeIds, edgeIds, metricIds, errors }) {
  const outgoingEdgesBySource = buildOutgoingEdgesBySource()
  const seenProductNodeIds = new Set()

  for (const [index, product] of (input.products || []).entries()) {
    const pointer = `products[${index}]`
    if (!product.productNodeId) errors.push(`${pointer}.productNodeId is required`)
    else if (!nodeIds.has(product.productNodeId)) errors.push(`${pointer}.productNodeId unknown node ${product.productNodeId}`)
    if (product.productNodeId) {
      if (seenProductNodeIds.has(product.productNodeId)) errors.push(`${pointer}.productNodeId duplicates ${product.productNodeId}`)
      seenProductNodeIds.add(product.productNodeId)
    }

    const coverage = product.coverage || {}
    for (const field of ['evidenceType', 'source', 'evidenceText', 'commercializationType', 'isRevenueProduct']) {
      if (coverage[field] == null || coverage[field] === '') errors.push(`${pointer}.coverage.${field} is required`)
    }
    if (coverage.notes == null) errors.push(`${pointer}.coverage.notes is required`)
    if (!isAllowed(allowed, 'coverageEvidenceType', coverage.evidenceType)) errors.push(`${pointer}.coverage.evidenceType invalid: ${coverage.evidenceType}`)
    if (!isAllowed(allowed, 'commercializationType', coverage.commercializationType)) errors.push(`${pointer}.coverage.commercializationType invalid: ${coverage.commercializationType}`)
    validateNoTaxonomyEvidence(coverage.source, errors, `${pointer}.coverage.source`)
    validateNoTaxonomyEvidence(coverage.evidenceText, errors, `${pointer}.coverage.evidenceText`)

    if (product.financial != null) {
      validateProductFinancial(product.financial, { allowed, metricIds, errors }, `${pointer}.financial`)
    }

    const productEdges = product.edges || []
    for (const [edgeIndex, item] of productEdges.entries()) {
      validateProductEdge(product, item, { allowed, edgeIds, metricIds, errors }, `${pointer}.edges[${edgeIndex}]`)
    }

    if (coverage.commercializationType === 'external_sales') {
      const outgoingEdges = outgoingEdgesBySource.get(product.productNodeId) || []
      const providedTargets = new Set(productEdges.map((item) => item.target).filter(Boolean))
      const missing = outgoingEdges.filter((edge) => !providedTargets.has(edge.target))
      if (missing.length > 0) {
        errors.push(`${pointer} ${product.productNodeId} is external_sales but missing edge evidence: ${missing.map((edge) => edgeKey(edge.source, edge.target)).join(', ')}`)
      }
    }
  }
}

function validateNoTaxonomyEvidence(value, errors, pointer) {
  if (typeof value !== 'string') return
  if (/(taxonomy[\\/](nodes|edges)\.json|nodes\.json.*companies)/i.test(value)) {
    errors.push(`${pointer} must not use taxonomy nodes/edges as company coverage evidence`)
  }
}

function validateProductGrowthInput(item, { allowed, metricIds, errors }, pointer) {
  for (const field of ['companyId', 'productNodeId', 'period', 'growthMetricId', 'growthValueType', 'revenueScope', 'scopeLabel', 'shareOfScope', 'managementAttribution', 'hasProductRevenueAmount', 'hasProductRevenueGrowth', 'sourceMetricIds', 'graphTarget', 'notes']) {
    if (item[field] == null || item[field] === '') errors.push(`${pointer} ${field} is required`)
  }
  validateProductFinancial(item, { allowed, metricIds, errors }, pointer)
}

function validateProductFinancial(item, { allowed, metricIds, errors }, pointer) {
  for (const field of ['period', 'growthMetricId', 'growthValueType', 'revenueScope', 'scopeLabel', 'shareOfScope', 'managementAttribution', 'hasProductRevenueAmount', 'hasProductRevenueGrowth', 'sourceMetricIds']) {
    if (item[field] == null || item[field] === '') errors.push(`${pointer}.${field} is required`)
  }
  if (item.notes == null) errors.push(`${pointer}.notes is required`)
  if (item.growthMetricId && !metricIds.has(item.growthMetricId)) errors.push(`${pointer}.growthMetricId unknown metric ${item.growthMetricId}`)
  for (const metricId of item.sourceMetricIds || []) {
    if (!metricIds.has(metricId)) errors.push(`${pointer}.sourceMetricIds unknown metric ${metricId}`)
  }
  if (!isAllowed(allowed, 'growthValueType', item.growthValueType)) errors.push(`${pointer}.growthValueType invalid: ${item.growthValueType}`)
  if (!isAllowed(allowed, 'revenueScope', item.revenueScope)) errors.push(`${pointer}.revenueScope invalid: ${item.revenueScope}`)
  if (!isAllowed(allowed, 'shareOfScope', item.shareOfScope)) errors.push(`${pointer}.shareOfScope invalid: ${item.shareOfScope}`)
  if (!isAllowed(allowed, 'managementAttribution', item.managementAttribution)) errors.push(`${pointer}.managementAttribution invalid: ${item.managementAttribution}`)
  if (item.managementAttribution !== 'not_mentioned' && !item.attributionEvidenceText) {
    errors.push(`${pointer}.attributionEvidenceText is required when managementAttribution is ${item.managementAttribution}`)
  }
  if (item.growthValueType === 'not_disclosed' && item.growthValue !== null) {
    errors.push(`${pointer}.growthValue must be null when growthValueType is not_disclosed`)
  }
  if (item.growthValueType === 'yoy_ratio' && !Number.isFinite(item.growthValue)) {
    errors.push(`${pointer}.growthValue must be a number for yoy_ratio`)
  }
}

function validateProductEdge(product, edge, { allowed, edgeIds, metricIds, errors }, pointer) {
  for (const field of ['target', 'salesStatus', 'edgeAttribution', 'evidenceText', 'sourceMetricIds']) {
    if (edge[field] == null || edge[field] === '') errors.push(`${pointer}.${field} is required`)
  }
  if (edge.notes == null) errors.push(`${pointer}.notes is required`)
  if (!isAllowed(allowed, 'salesStatus', edge.salesStatus)) errors.push(`${pointer}.salesStatus invalid: ${edge.salesStatus}`)
  if (!isAllowed(allowed, 'edgeAttribution', edge.edgeAttribution)) errors.push(`${pointer}.edgeAttribution invalid: ${edge.edgeAttribution}`)
  for (const metricId of edge.sourceMetricIds || []) {
    if (!metricIds.has(metricId)) errors.push(`${pointer}.sourceMetricIds unknown metric ${metricId}`)
  }
  if (product.productNodeId && edge.target) {
    const key = edgeKey(product.productNodeId, edge.target)
    if (!edgeIds.has(key)) errors.push(`${pointer} unknown edge ${key}`)
  }
}

function validateGraphTarget(target, nodeIds, edgeIds, errors, pointer) {
  if (!target || typeof target !== 'object') {
    errors.push(`${pointer} is required`)
    return
  }
  if (target.type === 'node') {
    if (!target.id) errors.push(`${pointer}.id is required`)
    else if (!nodeIds.has(target.id)) errors.push(`${pointer} unknown node ${target.id}`)
    return
  }
  if (target.type === 'edge') {
    if (!target.source || !target.target) {
      errors.push(`${pointer}.source and ${pointer}.target are required`)
      return
    }
    const key = edgeKey(target.source, target.target)
    if (!edgeIds.has(key)) errors.push(`${pointer} unknown edge ${key}`)
    return
  }
  errors.push(`${pointer}.type must be node or edge`)
}

function warnMissingOutgoingEdgeInputs(input) {
  if (Array.isArray(input.products) && input.products.length > 0) return
  const outgoingEdgesBySource = buildOutgoingEdgesBySource()

  const nodeIds = new Set()
  for (const item of input.companyProductCoverage || []) {
    if (item.isRevenueProduct && item.productNodeId) nodeIds.add(item.productNodeId)
  }
  for (const item of input.productGrowthInputs || []) {
    if (item.productNodeId) nodeIds.add(item.productNodeId)
    if (item.graphTarget?.type === 'node' && item.graphTarget.id) nodeIds.add(item.graphTarget.id)
  }

  const providedEdgeKeys = new Set()
  for (const item of input.productGrowthInputs || []) {
    if (item.graphTarget?.type !== 'edge') continue
    providedEdgeKeys.add(edgeKey(item.graphTarget.source, item.graphTarget.target))
  }

  const reportLabel = input.report?.id || input.report?.companyName || 'unknown report'
  for (const nodeId of [...nodeIds].sort()) {
    const outgoingEdges = outgoingEdgesBySource.get(nodeId) || []
    for (const edge of outgoingEdges) {
      const key = edgeKey(edge.source, edge.target)
      if (providedEdgeKeys.has(key)) continue
      console.warn(`Warning: ${reportLabel} 覆盖节点 ${nodeId}，但未提供输出边 ${key} 的 productGrowthInputs。请检查该边是否漏掉了；若公司确实没有该边对应的对外业务和数据，可忽略。`)
    }
  }
}

function deriveExtracted(input) {
  const report = stripPrivate(input.report)
  const profile = input.companyProfile || {}
  const products = Array.isArray(input.products) && input.products.length > 0
    ? stripPrivate(input.products)
    : []
  const coverage = products.length > 0
    ? deriveCoverageFromProducts(input, products)
    : stripPrivate(input.companyProductCoverage || [])
  const growthInputs = products.length > 0
    ? deriveGrowthInputsFromProducts(input, products)
    : stripPrivate(input.productGrowthInputs || [])
  const graphSignals = products.length > 0
    ? deriveGraphSignalsFromProducts(input, products)
    : growthInputs.map((item) => deriveGraphSignal(input, item))
  const relatedNodeIds = unique([
    ...coverage.map((item) => item.productNodeId),
    ...graphSignals.flatMap((signal) => targetNodeIds(signal.target))
  ])

  const companySignal = {
    id: `${slug(report.companyId)}-${slug(report.period)}-company-watch-profile`,
    companyId: report.companyId,
    period: report.period,
    fields: {
      layer: profile.layer || '',
      techRoute: profile.techRoute || '',
      keyCustomers: profile.keyCustomers || [],
      relatedNodeIds: unique(coverage.map((item) => item.productNodeId))
    },
    estimated: true,
    confidence: 1,
    method: 'derived_from_company_product_coverage',
    sourceMetricIds: unique(growthInputs.flatMap((item) => item.sourceMetricIds || []))
  }

  const timelineEvents = input.timelineEvents?.length > 0
    ? stripPrivate(input.timelineEvents)
    : [{
        id: `${slug(report.companyId)}-${slug(report.period)}-report-published`,
        date: report.publishedAt,
        type: 'financial_report',
        title: `${report.companyName}发布 ${report.title}`,
        summary: input.notes?.summary || `${report.companyName}发布${report.period}报告。`,
        relatedNodeIds,
        relatedCompanyIds: [report.companyId],
        sourceReportId: report.id
      }]

  return {
    report,
    metrics: deriveFinancialMetrics(input.metrics || [], report),
    productCategoryMetrics: deriveProductCategoryMetrics(input.productCategoryMetrics || []),
    graphSignals,
    companySignals: [companySignal],
    timelineEvents,
    companyProductCoverage: coverage,
    productGrowthInputs: growthInputs,
    products,
    notes: stripPrivate(input.notes || {})
  }
}

function deriveCoverageFromProducts(input, products) {
  return products.map((product) => ({
    companyId: input.report.companyId,
    productNodeId: product.productNodeId,
    coverageEvidenceType: product.coverage.evidenceType,
    coverageSource: product.coverage.source,
    evidenceText: product.coverage.evidenceText,
    isRevenueProduct: product.coverage.isRevenueProduct,
    commercializationType: product.coverage.commercializationType,
    notes: product.coverage.notes || product.notes || ''
  }))
}

function deriveGrowthInputsFromProducts(input, products) {
  const result = []
  for (const product of products) {
    const financial = product.financial
    if (!financial) continue
    result.push({
      ...financial,
      id: `${slug(input.report.companyId)}-${slug(financial.period)}-${product.productNodeId}-node-growth-input`,
      companyId: input.report.companyId,
      productNodeId: product.productNodeId,
      graphTarget: { type: 'node', id: product.productNodeId }
    })
    for (const edge of product.edges || []) {
      result.push({
        ...financial,
        id: `${slug(input.report.companyId)}-${slug(financial.period)}-${product.productNodeId}-to-${edge.target}-growth-input`,
        companyId: input.report.companyId,
        productNodeId: product.productNodeId,
        graphTarget: { type: 'edge', source: product.productNodeId, target: edge.target },
        edgeAttribution: edge.edgeAttribution,
        salesStatus: edge.salesStatus,
        edgeEvidenceText: edge.evidenceText,
        edgeNotes: edge.notes,
        sourceMetricIds: unique([...(financial.sourceMetricIds || []), ...(edge.sourceMetricIds || [])])
      })
    }
  }
  return result
}

function deriveGraphSignalsFromProducts(input, products) {
  const result = []
  for (const product of products) {
    const financial = product.financial
    if (!financial || !Number.isFinite(financial.growthValue)) continue

    const nodeConfidence = scoreConfidence({
      'share-of-scope': financial.shareOfScope,
      'management-attribution': financial.managementAttribution
    })
    const nodeSignalId = `${slug(input.report.companyId)}-${slug(financial.period)}-${product.productNodeId}-node-growth`
    result.push(deriveGraphSignalFromProductFinancial(input, product, financial, nodeSignalId, nodeConfidence))

    for (const edge of product.edges || []) {
      const edgeConfidence = scoreEdgeConfidence(edge)
      if (!Number.isFinite(edgeConfidence.confidence) || edgeConfidence.confidence <= 0) continue
      const finalConfidence = roundConfidence(nodeConfidence.confidence * edgeConfidence.confidence)
      result.push(deriveGraphSignalFromProductEdge(input, product, financial, edge, nodeConfidence, edgeConfidence, finalConfidence))
    }
  }
  return result
}

function deriveGraphSignalFromProductFinancial(input, product, financial, id, confidence) {
  return {
    id,
    target: { type: 'node', id: product.productNodeId },
    metric: 'revenue_growth_yoy_proxy',
    value: financial.growthValue,
    unit: financial.growthValueType,
    period: financial.period,
    estimated: true,
    confidence: confidence.confidence,
    method: 'derived_from_product_node_financial',
    derived: true,
    derivedFrom: `${input.report.companyId}:${product.productNodeId}:${financial.period}`,
    confidenceModel: confidence.model,
    confidenceFactors: confidence.factors,
    sourceMetricIds: financial.sourceMetricIds,
    supportingContext: buildFinancialSupportingContext(financial)
  }
}

function deriveGraphSignalFromProductEdge(input, product, financial, edge, nodeConfidence, edgeConfidence, confidence) {
  return {
    id: `${slug(input.report.companyId)}-${slug(financial.period)}-${product.productNodeId}-to-${edge.target}-growth`,
    target: { type: 'edge', source: product.productNodeId, target: edge.target },
    metric: 'revenue_growth_yoy_proxy',
    value: financial.growthValue,
    unit: financial.growthValueType,
    period: financial.period,
    estimated: true,
    confidence,
    method: 'derived_from_product_node_financial_and_edge_evidence',
    derived: true,
    derivedFrom: `${input.report.companyId}:${product.productNodeId}:${financial.period}`,
    confidenceModel: 'node_confidence_x_edge_confidence',
    confidenceFactors: {
      node: nodeConfidence.factors,
      edge: edgeConfidence.factors
    },
    sourceMetricIds: unique([...(financial.sourceMetricIds || []), ...(edge.sourceMetricIds || [])]),
    supportingContext: [
      ...buildFinancialSupportingContext(financial),
      {
        source: 'edge_attribution',
        metric: edge.edgeAttribution,
        value: edge.evidenceText,
        unit: 'text'
      },
      {
        source: 'sales_status',
        metric: edge.salesStatus,
        value: edge.notes || '',
        unit: 'text'
      }
    ]
  }
}

function buildFinancialSupportingContext(financial) {
  return [
    {
      source: financial.scopeLabel,
      metric: financial.growthMetricId,
      value: financial.growthValue,
      unit: financial.growthValueType
    },
    {
      source: 'management_attribution',
      metric: financial.managementAttribution,
      value: financial.attributionEvidenceText || '未提及',
      unit: 'text'
    },
    {
      source: 'share_of_scope',
      metric: financial.shareOfScope,
      value: financial.notes,
      unit: 'text'
    }
  ]
}

function deriveGraphSignal(input, item) {
  const confidence = scoreConfidence({
    'share-of-scope': item.shareOfScope,
    'management-attribution': item.managementAttribution
  })
  const target = stripPrivate(item.graphTarget)
  const targetId = target.type === 'edge'
    ? `${target.source}-to-${target.target}`
    : target.id
  return {
    id: item.id || `${slug(input.report.companyId)}-${slug(item.period)}-${targetId}-revenue-growth-yoy`,
    target,
    metric: 'revenue_growth_yoy_proxy',
    value: item.growthValue,
    unit: item.growthValueType,
    period: item.period,
    estimated: true,
    confidence: confidence.confidence,
    method: 'derived_from_product_growth_input',
    derived: true,
    derivedFrom: item.id || `${item.companyId}:${item.productNodeId}:${item.period}`,
    confidenceModel: confidence.model,
    confidenceFactors: confidence.factors,
    sourceMetricIds: item.sourceMetricIds,
    supportingContext: [
      {
        source: item.scopeLabel,
        metric: item.growthMetricId,
        value: item.growthValue,
        unit: item.growthValueType
      },
      {
        source: 'management_attribution',
        metric: item.managementAttribution,
        value: item.attributionEvidenceText || '未提及',
        unit: 'text'
      },
      {
        source: 'share_of_scope',
        metric: item.shareOfScope,
        value: item.notes,
        unit: 'text'
      }
    ]
  }
}

function deriveFinancialMetrics(metrics, report) {
  const result = stripPrivate(metrics || [])
  const byId = new Map(result.map((metric) => [metric.id, metric]))
  const revenue = byId.get('revenue')
  const cost = byId.get('operating_cost') || byId.get('cost_of_revenue')
  const existingGrossProfit = byId.get('gross_profit')

  if (revenue && cost && Number.isFinite(revenue.value) && Number.isFinite(cost.value)) {
    const grossProfit = revenue.value - cost.value
    const grossMargin = revenue.value !== 0 ? grossProfit / revenue.value : null
    const previousRevenue = previousValueFromYoy(revenue.value, revenue.yoy)
    const previousCost = previousValueFromYoy(cost.value, cost.yoy)
    const previousGrossProfit = Number.isFinite(previousRevenue) && Number.isFinite(previousCost)
      ? previousRevenue - previousCost
      : null
    const grossProfitYoy = Number.isFinite(previousGrossProfit) && previousGrossProfit !== 0
      ? (grossProfit - previousGrossProfit) / previousGrossProfit
      : undefined
    const previousGrossMargin = Number.isFinite(previousRevenue) && previousRevenue !== 0 && Number.isFinite(previousGrossProfit)
      ? previousGrossProfit / previousRevenue
      : null

    if (!byId.has('gross_profit')) {
      result.push({
        id: 'gross_profit',
        label: '毛利',
        value: grossProfit,
        unit: revenue.unit || report.currency || '',
        period: revenue.period || report.period,
        ...(Number.isFinite(grossProfitYoy) ? { yoy: grossProfitYoy } : {}),
        derived: true,
        formula: 'revenue - operating_cost',
        sourceMetricIds: [revenue.id, cost.id],
        sourceSection: cost.sourceSection || revenue.sourceSection || ''
      })
    }

    if (!byId.has('gross_margin') && Number.isFinite(grossMargin)) {
      result.push({
        id: 'gross_margin',
        label: '毛利率',
        value: grossMargin,
        unit: 'ratio',
        period: revenue.period || report.period,
        ...(Number.isFinite(previousGrossMargin) ? { yoyChangePpt: (grossMargin - previousGrossMargin) * 100 } : {}),
        derived: true,
        formula: 'gross_profit / revenue',
        sourceMetricIds: [revenue.id, cost.id],
        sourceSection: cost.sourceSection || revenue.sourceSection || ''
      })
    }
  }

  if (
    revenue &&
    existingGrossProfit &&
    !byId.has('gross_margin') &&
    Number.isFinite(revenue.value) &&
    revenue.value !== 0 &&
    Number.isFinite(existingGrossProfit.value)
  ) {
    result.push({
      id: 'gross_margin',
      label: '毛利率',
      value: existingGrossProfit.value / revenue.value,
      unit: 'ratio',
      period: revenue.period || report.period,
      derived: true,
      formula: 'gross_profit / revenue',
      sourceMetricIds: [revenue.id, existingGrossProfit.id],
      sourceSection: existingGrossProfit.sourceSection || revenue.sourceSection || ''
    })
  }

  return result
}

function deriveProductCategoryMetrics(items) {
  return stripPrivate(items || []).map((item) => {
    const revenue = item.revenue
    const cost = item.operatingCost
    const next = { ...item }

    if (next.grossProfit == null && Number.isFinite(revenue) && Number.isFinite(cost)) {
      next.grossProfit = revenue - cost
      next.grossProfitDerived = true
      next.grossProfitFormula = 'revenue - operatingCost'
    }

    if (next.grossMargin == null && Number.isFinite(next.grossProfit) && Number.isFinite(revenue) && revenue !== 0) {
      next.grossMargin = next.grossProfit / revenue
      next.grossMarginDerived = true
      next.grossMarginFormula = 'grossProfit / revenue'
    }

    return next
  })
}

function previousValueFromYoy(value, yoy) {
  if (!Number.isFinite(value) || !Number.isFinite(yoy) || yoy <= -1) return null
  return value / (1 + yoy)
}

function stripPrivate(value) {
  if (Array.isArray(value)) return value.map(stripPrivate)
  if (!value || typeof value !== 'object') return value
  const result = {}
  for (const [key, child] of Object.entries(value)) {
    if (!key.startsWith('_')) result[key] = stripPrivate(child)
  }
  return result
}

function scoreConfidence(options) {
  const config = JSON.parse(fs.readFileSync(rulesPath, 'utf8'))
  const shareKey = options['share-of-scope'] || options.shareOfScope
  const attributionKey = options['management-attribution'] || options.managementAttribution
  if (!shareKey || !attributionKey) {
    throw new Error('score-confidence requires --share-of-scope and --management-attribution.')
  }
  const confidence = config.confidenceMatrix?.[shareKey]?.[attributionKey]
  if (!Number.isFinite(confidence)) throw new Error(`Unknown confidence matrix cell: ${shareKey} x ${attributionKey}`)
  return {
    model: config.model,
    confidence,
    factors: {
      shareOfScope: {
        key: shareKey,
        label: config.labels?.shareOfScope?.[shareKey] || shareKey
      },
      managementAttribution: {
        key: attributionKey,
        label: config.labels?.managementAttribution?.[attributionKey] || attributionKey
      }
    }
  }
}

function scoreEdgeConfidence(edge) {
  const config = JSON.parse(fs.readFileSync(rulesPath, 'utf8'))
  const salesKey = edge.salesStatus
  const attributionKey = edge.edgeAttribution
  const confidence = config.edgeConfidenceMatrix?.[salesKey]?.[attributionKey]
  if (!Number.isFinite(confidence)) throw new Error(`Unknown edge confidence matrix cell: ${salesKey} x ${attributionKey}`)
  return {
    model: config.edgeModel || 'edge_attribution_matrix',
    confidence,
    factors: {
      salesStatus: {
        key: salesKey,
        label: config.labels?.salesStatus?.[salesKey] || salesKey
      },
      edgeAttribution: {
        key: attributionKey,
        label: config.labels?.edgeAttribution?.[attributionKey] || attributionKey
      }
    }
  }
}

function parseArgs(args) {
  const result = { _: [] }
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index]
    if (!token.startsWith('--')) {
      result._.push(token)
      continue
    }
    const raw = token.slice(2)
    const eq = raw.indexOf('=')
    const key = eq >= 0 ? raw.slice(0, eq) : raw
    const value = eq >= 0 ? raw.slice(eq + 1) : args[index + 1]?.startsWith('--') || args[index + 1] == null ? true : args[++index]
    if (result[key] == null) result[key] = value
    else if (Array.isArray(result[key])) result[key].push(value)
    else result[key] = [result[key], value]
  }
  return result
}

function findExtractedHits(extracted, audit) {
  const hits = []
  walk(extracted, (value, pointer) => {
    if (!value || typeof value !== 'object') return
    if (audit.type.includes('node')) {
      if (value.target?.type === 'node' && value.target.id === audit.oldId) {
        hits.push({ path: pointer, reason: `graph signal targets node ${audit.oldId}` })
      }
      if (value.target?.type === 'edge' && (value.target.source === audit.oldId || value.target.target === audit.oldId)) {
        hits.push({ path: pointer, reason: `graph signal edge touches node ${audit.oldId}` })
      }
      if (Array.isArray(value.relatedNodeIds) && value.relatedNodeIds.includes(audit.oldId)) {
        hits.push({ path: pointer, reason: `relatedNodeIds includes ${audit.oldId}` })
      }
    }
    if (audit.type.includes('edge') && value.target?.type === 'edge') {
      const key = edgeKey(value.target.source, value.target.target)
      if (key === audit.oldId) hits.push({ path: pointer, reason: `graph signal targets edge ${audit.oldId}` })
    }
  })
  return hits
}

function validateAuditTargets(audit) {
  if (audit.type.includes('node')) {
    validateNodeIds(audit.newIds)
  }
  if (audit.type.includes('edge')) {
    for (const key of audit.newIds) {
      const [source, target] = key.split('->')
      validateEdge(source, target)
    }
  }
}

function validateNodeIds(ids) {
  if (ids.length === 0) return
  const nodeIds = new Set(loadNodes().map((node) => node.id))
  for (const id of ids) {
    if (!nodeIds.has(id)) throw new Error(`Unknown node id: ${id}`)
  }
}

function validateEdge(source, target) {
  const edgeIds = new Set(loadEdges().map((edge) => edgeKey(edge.source, edge.target)))
  const key = edgeKey(source, target)
  if (!edgeIds.has(key)) throw new Error(`Unknown edge: ${key}`)
}

function validateEdgeKey(key) {
  if (!key.includes(':') && !key.includes('->')) throw new Error(`Invalid edge key: ${key}`)
}

function parseSplit(spec) {
  const [oldRaw, nextRaw] = String(spec).split('=')
  if (!oldRaw || !nextRaw) throw new Error(`Invalid split spec "${spec}". Use old=new1,new2.`)
  return {
    oldId: normalizeEdgeKey(oldRaw),
    newIds: splitList(nextRaw).map(normalizeEdgeKey)
  }
}

function normalizeEdgeKey(value) {
  return String(value).replace(':', '->')
}

function edgeKey(source, target) {
  return `${source}->${target}`
}

function buildOutgoingEdgesBySource() {
  const outgoingEdgesBySource = new Map()
  for (const edge of loadEdges()) {
    if (!outgoingEdgesBySource.has(edge.source)) outgoingEdgesBySource.set(edge.source, [])
    outgoingEdgesBySource.get(edge.source).push(edge)
  }
  return outgoingEdgesBySource
}

function targetNodeIds(target) {
  if (target.type === 'node') return [target.id]
  if (target.type === 'edge') return [target.source, target.target]
  return []
}

function loadNodes() {
  return JSON.parse(fs.readFileSync(path.join(taxonomyRoot, 'nodes.json'), 'utf8'))
}

function loadEdges() {
  return JSON.parse(fs.readFileSync(path.join(taxonomyRoot, 'edges.json'), 'utf8'))
}

function loadCompanies() {
  return JSON.parse(fs.readFileSync(path.join(taxonomyRoot, 'companies.json'), 'utf8'))
}

function findFiles(dir, filename) {
  if (!fs.existsSync(dir)) return []
  const result = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name.startsWith('_')) continue
      result.push(...findFiles(full, filename))
    }
    else if (entry.name === filename) result.push(full)
  }
  return result
}

function walk(value, visitor, pointer = '$') {
  visitor(value, pointer)
  if (!value || typeof value !== 'object') return
  if (Array.isArray(value)) {
    value.forEach((item, index) => walk(item, visitor, `${pointer}[${index}]`))
    return
  }
  for (const [key, child] of Object.entries(value)) {
    walk(child, visitor, `${pointer}.${key}`)
  }
}

function splitList(value) {
  if (value == null || value === true || value === '') return []
  if (Array.isArray(value)) return value.flatMap(splitList)
  return String(value).split(/[|,]/).map((item) => item.trim()).filter(Boolean)
}

function unique(values) {
  return [...new Set(values.filter(Boolean))]
}

function slug(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function relative(file) {
  return path.relative(root, file).replaceAll(path.sep, '/')
}

function formatYoy(value) {
  return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(1)}%`
}

function formatPercent(value) {
  return `${Math.round(value * 100)}%`
}

function formatNumber(value) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value)
}

function roundConfidence(value) {
  return Math.round(value * 1000) / 1000
}

function printJson(value) {
  console.log(JSON.stringify(value, null, 2))
}

function describeAudit(audit) {
  if (audit.type.startsWith('split')) return `${audit.oldId} => ${audit.newIds.join(', ')}`
  return audit.oldId
}

function printHelp() {
  console.log(`ChainSight report-kit

Commands:
  process-extraction <path> [--force]
  process-mapping <path> [--facts path] [--output path] [--force]
  score-confidence --share-of-scope key --management-attribution key
  audit-topology --split-node old=new1,new2
  audit-topology --split-edge source:target=newSource:newTarget
  validate-reports

Examples:
  node scripts/report-kit.mjs process-extraction src/data/reports/2026/example/extraction.json --force
  node scripts/report-kit.mjs process-mapping src/data/reports/2026/example/mapping.json --force
  node scripts/report-kit.mjs score-confidence --share-of-scope medium_30_80_or_unknown --management-attribution core_driver
  node scripts/report-kit.mjs audit-topology --split-node cw_light_source=cw_light_source,eml_laser_chip
`)
}
