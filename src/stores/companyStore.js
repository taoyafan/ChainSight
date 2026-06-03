import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import companiesData from '@/data/companies.json'

export const useCompanyStore = defineStore('company', () => {
  const companies = ref(companiesData)
  const watchlist = ref([]) // 收藏的公司 id 列表

  const companyMap = computed(() => {
    const map = {}
    companies.value.forEach(c => { map[c.id] = c })
    return map
  })

  const layers = computed(() =>
    [...new Set(companies.value.map(c => c.layer))]
  )

  const stages = computed(() =>
    [...new Set(companies.value.map(c => c.stage))]
  )

  function toggleWatch(companyId) {
    const idx = watchlist.value.indexOf(companyId)
    if (idx >= 0) {
      watchlist.value.splice(idx, 1)
    } else {
      watchlist.value.push(companyId)
    }
  }

  function isWatched(companyId) {
    return watchlist.value.includes(companyId)
  }

  return { companies, watchlist, companyMap, layers, stages, toggleWatch, isWatched }
})
