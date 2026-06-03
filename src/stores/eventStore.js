import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import eventsData from '@/data/events.json'

export const useEventStore = defineStore('event', () => {
  const events = ref(eventsData)
  const filterLayer = ref(null)

  // 按时间倒序
  const sortedEvents = computed(() =>
    [...events.value].sort((a, b) => b.date.localeCompare(a.date))
  )

  const filteredEvents = computed(() => {
    if (!filterLayer.value) return sortedEvents.value
    // 需要结合 graphStore 的 nodeMap 来过滤层级
    return sortedEvents.value
  })

  const eventTypes = computed(() =>
    [...new Set(events.value.map(e => e.type))]
  )

  function setFilterLayer(layer) {
    filterLayer.value = layer
  }

  return { events, filterLayer, sortedEvents, filteredEvents, eventTypes, setFilterLayer }
})
