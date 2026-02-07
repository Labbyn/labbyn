import { queryOptions } from '@tanstack/react-query'
import { fetchDashboardData } from './user_dashboard.adapter'
import type { ApiDashboardResponse } from './user_dashboard.types'
import api from '@/lib/api'

const PATHS = {
  BASE: '/dashboard',
}

export const dashboardQueryOptions = queryOptions({
  queryKey: ['dashboard'],
  queryFn: async () => {
    const { data } = await api.get<ApiDashboardResponse>(PATHS.BASE)
    return fetchDashboardData(data)
  },
})
