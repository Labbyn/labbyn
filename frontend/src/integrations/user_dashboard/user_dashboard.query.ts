import { queryOptions } from '@tanstack/react-query'
import { fetchDashboardData } from './user_dashboard.adapter'
import type { ApiDashboardResponse } from './user_dashboard.types'

const DASHBOARD_ENDPOINT = `http://${import.meta.env.VITE_API_URL}/dashboard`

export const dashboardQueryOptions = queryOptions({
  queryKey: ['dashboard'],
  queryFn: async () => {
    const res = await fetch(DASHBOARD_ENDPOINT)
    if (!res.ok) {
      throw new Error('Failed to fetch dashboard')
    }

    const data: ApiDashboardResponse = await res.json()
    return fetchDashboardData(data)
  },
})
