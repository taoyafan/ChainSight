<template>
  <n-button quaternary size="small" @click="showModal = true">
    <template #icon>
      <n-icon><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></n-icon>
    </template>
    纠错/补充
  </n-button>

  <n-modal v-model:show="showModal" preset="dialog" title="数据纠错 / 补充">
    <n-form ref="formRef" :model="form" label-placement="top">
      <n-form-item label="反馈类型">
        <n-select v-model:value="form.type" :options="typeOptions" />
      </n-form-item>
      <n-form-item label="相关内容">
        <n-input v-model:value="form.target" placeholder="节点名称 / 公司 / 事件" />
      </n-form-item>
      <n-form-item label="详细说明">
        <n-input v-model:value="form.detail" type="textarea" :rows="4" placeholder="请描述需要纠正或补充的内容" />
      </n-form-item>
    </n-form>
    <template #action>
      <n-button @click="showModal = false">取消</n-button>
      <n-button type="primary" @click="handleSubmit">提交</n-button>
    </template>
  </n-modal>
</template>

<script setup>
import { ref } from 'vue'
import { NButton, NIcon, NModal, NForm, NFormItem, NInput, NSelect, useMessage } from 'naive-ui'

const props = defineProps({
  context: { type: String, default: '' },
})

const message = useMessage()
const showModal = ref(false)
const form = ref({
  type: 'correction',
  target: props.context,
  detail: '',
})

const typeOptions = [
  { label: '数据纠错', value: 'correction' },
  { label: '信息补充', value: 'supplement' },
  { label: '建议', value: 'suggestion' },
]

function handleSubmit() {
  // 暂存到 localStorage，后续接后端
  const feedbacks = JSON.parse(localStorage.getItem('chainsight_feedbacks') || '[]')
  feedbacks.push({
    ...form.value,
    timestamp: new Date().toISOString(),
  })
  localStorage.setItem('chainsight_feedbacks', JSON.stringify(feedbacks))
  message.success('感谢反馈，已暂存本地')
  showModal.value = false
  form.value = { type: 'correction', target: props.context, detail: '' }
}
</script>
