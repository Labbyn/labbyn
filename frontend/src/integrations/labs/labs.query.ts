import { queryOptions } from '@tanstack/react-query'
import { fetchInventoryData } from './labs.adapter'
import type { ApiLabsResponse } from './labs.types'

const LABS_ENDPOINT = `http://${import.meta.env.VITE_API_URL}/labs`

export const labsQueryOptions = queryOptions({
  queryKey: ['labs'],
  queryFn: async () => {
    const res = await fetch(LABS_ENDPOINT)
    if (!res.ok) throw new Error('Failed to fetch inventory')

    const data: ApiLabsResponse = await res.json()
    return fetchInventoryData(data)
  },
})
