import { queryOptions } from '@tanstack/react-query'
import type { ApiHistoryResponse } from './history.types'
import api from '@/lib/api'

const PATHS = {
  BASE: '/db/history',
}

// Fetch history with limit
export const historyQueryOptions = (limit: number = 200) =>
  queryOptions({
    queryKey: ['history', { limit }],
    queryFn: async () => {
      const { data } = await api.get<ApiHistoryResponse>(PATHS.BASE, {
        params: { limit },
      })
      return data
    },
  })
