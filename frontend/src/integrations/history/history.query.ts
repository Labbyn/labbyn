import { queryOptions } from '@tanstack/react-query'
import type { ApiHistoryItem, ApiHistoryResponse } from './history.types'
import api from '@/lib/api'

const PATHS = {
  BASE: '/sub/history',
  SINGLE: (id: string | number) => `/sub/history/${id}`,
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

export const singleHistoryQueryOptions = (hisId: string | number) =>
  queryOptions({
    queryKey: ['history', String(hisId)],
    queryFn: async () => {
      const { data } = await api.get<ApiHistoryItem>(PATHS.SINGLE(hisId))
      return data
    },
  })
