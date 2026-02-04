import { queryOptions } from '@tanstack/react-query'
import { fetchHistoryData } from './history.adapter'
import type { ApiHistoryResponse } from './history.types'

const HISTORY_ENDPOINT = `http://${import.meta.env.VITE_API_URL}/db/history/`

export const historyQueryOptions = (limit: number = 200) => 
  queryOptions({
    queryKey: ['history', limit],
    queryFn: async () => {
      const res = await fetch(`${HISTORY_ENDPOINT}?limit=${limit}`)
      if (!res.ok) throw new Error('Failed to fetch history')

      const data: ApiHistoryResponse = await res.json()
      return fetchHistoryData(data)
    },
  })
  