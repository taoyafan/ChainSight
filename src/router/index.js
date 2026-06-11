import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'topology',
    component: () => import('@/views/TopologyView.vue'),
  },
  {
    path: '/timeline',
    name: 'timeline',
    component: () => import('@/views/TimelineViewPage.vue'),
  },
  {
    path: '/reports/:reportId',
    name: 'report-detail',
    component: () => import('@/views/ReportDetailView.vue'),
  },
  {
    path: '/watchlist',
    name: 'watchlist',
    component: () => import('@/views/WatchlistView.vue'),
  },
  {
    path: '/node/:nodeId',
    name: 'node-analysis',
    component: () => import('@/views/NodeAnalysisView.vue'),
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

export default router
