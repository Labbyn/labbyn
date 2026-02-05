import { queryOptions } from '@tanstack/react-query'
import type { ApiInventoryResponse } from './inventory.types'
import api from '@/lib/api'

const PATHS = {
  BASE: '/db/inventory',
}

export const inventoryQueryOptions = queryOptions({
  queryKey: ['inventory'],
  queryFn: async () => {
    const { data } = await api.get<ApiInventoryResponse>(PATHS.BASE)
    return data
  },
})
