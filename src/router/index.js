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
    path: '/watchlist',
    name: 'watchlist',
    component: () => import('@/views/WatchlistView.vue'),
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

export default router
