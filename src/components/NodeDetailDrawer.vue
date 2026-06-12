<template>
  <n-drawer v-model:show="visible" :width="420" placement="right">
    <n-drawer-content :title="node?.label || '节点详情'" closable>
      <template v-if="node">
        <n-descriptions :column="1" label-placement="left" bordered size="small">
          <n-descriptions-item label="当前状态">
            <n-tag :type="statusType" size="small">{{ STATUS_TEXT[node.status] || node.status }}</n-tag>
          </n-descriptions-item>
          <n-descriptions-item label="替代方案有限性">
            {{ node.altLimitNote || '—' }}
          </n-descriptions-item>
        </n-descriptions>

        <n-alert v-if="nodeIntro" type="info" title="简要介绍" style="margin-top: 16px;">
          {{ nodeIntro }}
        </n-alert>

        <!-- 瓶颈标记 -->
        <n-alert v-if="node.bottleneck" type="warning" title="潜在瓶颈" style="margin-top: 16px;">
          {{ node.bottleneckNote }}
        </n-alert>

        <n-card size="small" style="margin-top: 16px;" :bordered="true">
          <template #header>文字信号</template>
          <n-list v-if="qualitativeItems.length" bordered>
            <n-list-item v-for="item in qualitativeItems" :key="item.signal.id">
              <n-thing>
                <template #header>
                  <n-space align="center" size="small">
                    <n-tag size="tiny" :color="signalTagColor(item.signal)">
                      {{ signalTypeText(item.signal.signalType) }}
                    </n-tag>
                    <n-tag size="tiny" :type="signalTagType(item.signal)">
                      {{ signalToneText(item.signal) }}
                    </n-tag>
                    <n-text depth="3">{{ item.report.companyName || item.signal.companyId }}</n-text>
                  </n-space>
                </template>
                <template #description>
                  <n-space vertical size="small">
                    <n-text>{{ item.signal.evidenceText }}</n-text>
                    <n-text depth="3">
                      {{ strengthText(item.signal.strength) }} · {{ timeHorizonText(item.signal.timeHorizon) }}
                      <template v-if="isConstraint(item.signal)"> · 需求强但兑现受供给约束</template>
                    </n-text>
                  </n-space>
                </template>
              </n-thing>
            </n-list-item>
          </n-list>
          <n-empty v-else size="small" description="暂无文字信号" />
        </n-card>

        <n-card size="small" style="margin-top: 16px;" :bordered="true">
          <template #header>收入 proxy 份额</template>
          <n-space v-if="revenueItems.length" vertical size="small">
            <div
              v-for="item in revenueItems.slice(0, 3)"
              :key="item.companyId"
              class="share-row"
            >
              <div class="share-row__meta">
                <n-text>{{ item.company.name }}</n-text>
                <n-text depth="3">{{ formatPercent(item.share) }}</n-text>
              </div>
              <div class="share-bar">
                <div class="share-bar__fill" :style="{ width: formatPercent(item.share) }" />
              </div>
            </div>
            <n-button size="small" secondary type="primary" @click="handleAnalysisClick">
              查看完整分析
            </n-button>
          </n-space>
          <n-empty v-else size="small" description="暂无可估算收入 proxy" />
        </n-card>

        <!-- 主要供应商 -->
        <n-h4 style="margin-top: 20px;">观察表覆盖公司</n-h4>
        <n-list v-if="nodeCompanies.length" bordered>
          <n-list-item v-for="company in nodeCompanies" :key="company.id">
            <template v-if="company">
              <n-thing>
                <template #header>
                  <n-button text @click="handleCompanyClick(company.id)">
                    {{ company.name }}
                  </n-button>
                  <n-text depth="3" style="margin-left: 8px;">{{ company.ticker }}</n-text>
                </template>
                <template #description>
                  <n-space size="small">
                    <n-tag size="tiny" :type="stageTagType(company.stage)">
                      {{ STATUS_TEXT[company.stage] || company.stage }}
                    </n-tag>
                    <n-text depth="3">{{ company.techRoute }}</n-text>
                  </n-space>
                </template>
              </n-thing>
            </template>
          </n-list-item>
        </n-list>
        <n-empty v-else size="small" description="标的观察表暂无覆盖公司" />

        <!-- 反馈按钮 -->
        <div style="margin-top: 16px; text-align: right;">
          <FeedbackButton :context="node.label" />
        </div>
      </template>
    </n-drawer-content>
  </n-drawer>
</template>

<script setup>
import { computed } from 'vue'
import {
  NDrawer, NDrawerContent, NDescriptions, NDescriptionsItem,
  NTag, NAlert, NCard, NSpace, NText, NH4,
  NList, NListItem, NThing, NButton, NEmpty
} from 'naive-ui'
import FeedbackButton from './FeedbackButton.vue'
import { STATUS_TEXT } from '@/utils/helpers'
import {
  getNodeQualitativeSignals,
  getNodeRevenueProxyItems,
  getNodeWatchRows,
} from '@/utils/reportRepository'
import {
  QUALITATIVE_SIGNAL_TEXT,
  QUALITATIVE_STRENGTH_TEXT,
  QUALITATIVE_TIME_HORIZON_TEXT,
  isConstraintSignal,
  qualitativeSignalTone,
} from '@/utils/qualitativeSignals'

const props = defineProps({
  node: { type: Object, default: null },
})

const visible = defineModel('show', { type: Boolean, default: false })

const emit = defineEmits(['company-click', 'node-analysis'])

const NODE_INTRO = {
  iii_v_epi_wafer: 'III-V 外延片/晶圆是 InP、GaAs 等化合物半导体激光芯片的上游基础，外延质量和晶圆工艺直接影响激光器效率、良率和一致性。',
  cw_light_source: 'CW 光源/激光芯片提供连续波外置光源，主要服务硅光、CPO、OIO 等光引擎路线，和传统可插拔模块中的 EML 发射芯片是两条不同方案。',
  eml_laser_chip: 'EML/DFB 光通信激光芯片是 EML 路线的发射端核心器件，上游来自 III-V 外延/晶圆，下游进入 EML 光引擎。',
  eml_transmit_engine: 'EML \u5149\u5f15\u64ce\u628a EML/DFB \u53d1\u5c04\u7aef\u3001\u9a71\u52a8/\u63a5\u6536\u76f8\u5173\u5668\u4ef6\u96c6\u6210\u4e3a\u53ef\u63d2\u62d4\u5149\u6a21\u5757\u5185\u90e8\u7684\u5149\u7ec4\u4ef6\uff0c\u533a\u522b\u4e8e\u7845\u5149\u5f15\u64ce\u8def\u7ebf\u3002',
  soi_photonic_wafer: '硅光/SOI 晶圆承载硅光调制器、波导、耦合结构等无源和有源光电结构，是硅光芯片制造的基础平台。',
  silicon_photonic_modulator: '硅光调制器把电信号调制到光信号上，是硅光发射链路中的关键器件，性能影响带宽、功耗和信号质量。',
  silicon_photonic_integrated_pd: '\u96c6\u6210 PD \u662f\u7845\u5149\u5f15\u64ce\u548c CPO \u6a21\u7ec4\u63a5\u6536\u7aef\u7684\u63a2\u6d4b\u5668\u80fd\u529b\uff0c\u901a\u5e38\u548c\u7845\u5149\u82af\u7247\u3001\u5c01\u88c5\u8026\u5408\u4e00\u8d77\u8bbe\u8ba1\u3002',
  eml_pd_module: 'PD \u6a21\u5757\u9762\u5411 EML/DFB \u53ef\u63d2\u62d4\u5149\u6a21\u5757\u63a5\u6536\u7aef\uff0c\u662f\u548c\u96c6\u6210 PD \u5206\u5f00\u7684\u4f20\u7edf\u6a21\u5757\u8def\u7ebf\u5668\u4ef6\u3002',
  faraday_rotator: '\u6cd5\u62c9\u7b2c\u65cb\u8f6c\u7247\u662f\u5149\u9694\u79bb\u5668\u7684\u6838\u5fc3\u78c1\u5149\u5668\u4ef6\uff0c\u7528\u4e8e\u4f7f\u5149\u504f\u632f\u65b9\u5411\u53d1\u751f\u975e\u4e92\u6613\u65cb\u8f6c\u3002',
  optical_isolator: '\u5149\u9694\u79bb\u5668\u901a\u8fc7\u6291\u5236\u53cd\u5c04\u5149\u56de\u4f20\u6765\u4fdd\u62a4\u5149\u6a21\u5757\u53d1\u5c04\u94fe\u8def\uff0c\u5728 EML/DFB \u548c\u7845\u5149\u53ef\u63d2\u62d4\u6a21\u5757\u4e2d\u90fd\u53ef\u80fd\u51fa\u73b0\u3002',
  silicon_photonic_engine: '\u7845\u5149\u5f15\u64ce\u628a CW \u5149\u6e90\u3001\u7845\u5149\u8c03\u5236\u5668\u3001\u96c6\u6210 PD\u3001\u5149\u7ea4\u8026\u5408\u7b49\u80fd\u529b\u96c6\u6210\uff0c\u662f\u7845\u5149\u53ef\u63d2\u62d4\u548c CPO \u8def\u7ebf\u7684\u6838\u5fc3\u4e2d\u95f4\u73af\u8282\u3002',
  cpo_fiber_array: 'CPO \u5149\u7ea4\u9635\u5217\u670d\u52a1\u4e8e\u5171\u5c01\u88c5\u573a\u666f\uff0c\u5bf9\u9ad8\u5bc6\u5ea6\u8026\u5408\u3001\u88c5\u914d\u7cbe\u5ea6\u548c\u957f\u671f\u53ef\u9760\u6027\u8981\u6c42\u66f4\u9ad8\u3002',
  silicon_photonic_fiber_array: '\u7845\u5149\u5149\u7ea4\u9635\u5217\u8d1f\u8d23\u628a\u7845\u5149\u5f15\u64ce\u4e2d\u7684\u5149\u4fe1\u53f7\u7a33\u5b9a\u8026\u5408\u5230\u5916\u90e8\u5149\u7ea4\uff0c\u548c CPO \u5149\u7ea4\u9635\u5217\u5206\u5f00\u7edf\u8ba1\u3002',
  cpo_module: 'CPO 模组把光引擎与交换芯片或封装基板紧密集成，目标是缩短电互连距离、降低高速互连功耗。',
  optical_module: '光模块是财报中常见的粗口径产品节点，用来承接未拆分到 EML/DFB 与硅光路线的收入、增速或毛利数据。',
  eml_pluggable_module: 'EML/DFB 可插拔光模块是当前数据中心交换机常用的独立光模块形态，发射端通常集成 EML/DFB 激光芯片。',
  silicon_photonic_pluggable_module: '硅光可插拔光模块把硅光光引擎封装进可插拔形态，兼顾硅光集成优势和现有交换机端口生态。',
  switch_asic: '交换芯片负责数据中心网络交换和转发，是决定交换机带宽、端口速率和 SerDes 能力的核心计算芯片。',
  cpo_switch: 'CPO 交换机是在交换机系统内集成 CPO 光互连的形态，目标是支撑更高速率交换芯片并降低前面板光模块功耗。',
  data_center_switch: '数据中心交换机连接服务器、存储和上层网络设备，是高速光模块最大的下游应用之一。',
  ai_server: 'AI 服务器承载 GPU/加速卡与高速网络互连需求，训练和推理集群规模扩张会拉动光互连用量。',
  cloud_dc: '云厂商数据中心是最终需求侧，资本开支、AI 集群建设和网络架构升级会传导到交换机、光模块和上游光芯片。',
}

const nodeCompanies = computed(() => getNodeWatchRows(props.node?.id))
const revenueItems = computed(() => getNodeRevenueProxyItems(props.node?.id))
const qualitativeItems = computed(() => getNodeQualitativeSignals(props.node?.id))
const nodeIntro = computed(() => NODE_INTRO[props.node?.id] || '')

const statusType = computed(() => {
  const map = { RnD: 'default', sampling: 'warning', mass_prod: 'success' }
  return map[props.node?.status] || 'default'
})

function stageTagType(stage) {
  const map = { RnD: 'default', sampling: 'warning', mass_prod: 'success' }
  return map[stage] || 'default'
}

function handleCompanyClick(companyId) {
  emit('company-click', companyId)
}

function handleAnalysisClick() {
  if (!props.node?.id) return
  emit('node-analysis', props.node.id)
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return '—'
  return `${(value * 100).toFixed(value >= 0.1 ? 0 : 1)}%`
}
function signalTypeText(type) {
  return QUALITATIVE_SIGNAL_TEXT[type] || type || '-'
}

function signalToneText(signal) {
  return qualitativeSignalTone(signal).text
}

function signalTagType(signal) {
  return qualitativeSignalTone(signal).tagType
}

function signalTagColor(signal) {
  const tone = qualitativeSignalTone(signal)
  return { color: tone.color, textColor: '#fff', borderColor: tone.color }
}

function strengthText(strength) {
  return `强度 ${QUALITATIVE_STRENGTH_TEXT[strength] || strength || '-'}`
}

function timeHorizonText(timeHorizon) {
  return QUALITATIVE_TIME_HORIZON_TEXT[timeHorizon] || timeHorizon || '-'
}

function isConstraint(signal) {
  return isConstraintSignal(signal)
}
</script>

<style scoped>
.share-row {
  display: grid;
  gap: 6px;
}

.share-row__meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
}

.share-bar {
  height: 8px;
  overflow: hidden;
  border-radius: 4px;
  background: rgba(99, 102, 241, 0.12);
}

.share-bar__fill {
  height: 100%;
  border-radius: inherit;
  background: #2563eb;
}
</style>
