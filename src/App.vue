<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NConfigProvider, NLayout, NLayoutHeader, NLayoutContent,
  NMenu, NSpace, NSwitch, NIcon, NText, NMessageProvider
} from 'naive-ui'
import { darkTheme } from 'naive-ui'

const router = useRouter()
const route = useRoute()
const isDark = ref(false)

const theme = computed(() => isDark.value ? darkTheme : null)

const menuValue = computed(() => route.name === 'node-analysis' ? 'topology' : route.name || 'topology')

const menuOptions = [
  { label: '产业链拓扑', key: 'topology' },
  { label: '变化时间线', key: 'timeline' },
  { label: '标的观察表', key: 'watchlist' },
]

function handleMenuUpdate(key) {
  router.push({ name: key })
}
</script>

<template>
  <n-config-provider :theme="theme">
    <n-message-provider>
      <n-layout style="height: 100vh;">
        <n-layout-header bordered style="padding: 0 20px; display: flex; align-items: center; justify-content: space-between; height: 56px;">
          <n-space align="center">
            <n-text strong style="font-size: 18px; letter-spacing: 1px;">⛓ ChainSight</n-text>
            <n-text depth="3" style="font-size: 12px;">CPO 产业链分析</n-text>
          </n-space>
          <n-space align="center">
            <n-menu
              mode="horizontal"
              :value="menuValue"
              :options="menuOptions"
              @update:value="handleMenuUpdate"
            />
            <n-switch v-model:value="isDark" size="small">
              <template #checked>🌙</template>
              <template #unchecked>☀️</template>
            </n-switch>
          </n-space>
        </n-layout-header>
        <n-layout-content content-style="height: calc(100vh - 56px); overflow: auto;">
          <router-view />
        </n-layout-content>
      </n-layout>
    </n-message-provider>
  </n-config-provider>
</template>
