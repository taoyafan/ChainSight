import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { timelineEvents } from '@/utils/reportRepository'

export const useEventStore = defineStore('event', () => {
  const filterLayer = ref(null)
  const allEvents = computed(() => [...timelineEvents])

  // 按时间倒序
  const sortedEvents = computed(() =>
    [...allEvents.value].sort((a, b) => b.date.localeCompare(a.date))
  )

  const filteredEvents = computed(() => {
    if (!filterLayer.value) return sortedEvents.value
    // 需要结合 graphStore 的 nodeMap 来过滤层级
    return sortedEvents.value
  })

  const eventTypes = computed(() =>
    [...new Set(allEvents.value.map(e => e.type))]
  )

  function setFilterLayer(layer) {
    filterLayer.value = layer
  }

  return { allEvents, filterLayer, sortedEvents, filteredEvents, eventTypes, setFilterLayer }
})
