import { queryOptions } from '@tanstack/react-query'
import type { ApiInventoryItem, ApiInventoryResponse } from './inventory.types'
import api from '@/lib/api'

const PATHS = {
  BASE: '/db/inventory',
  DETAIL: (id: string) => `/db/inventory/${id}`,
}

// Fetch full inventory list
export const inventoryQueryOptions = queryOptions({
  queryKey: ['inventory'],
  queryFn: async () => {
    const { data } = await api.get<ApiInventoryResponse>(PATHS.BASE)
    return data
  },
})

// Fetch single inventory item by ID
export const inventoryItemQueryOptions = (inventoryId: string) =>
  queryOptions({
    queryKey: ['inventory', inventoryId],
    queryFn: async () => {
      const { data } = await api.get<ApiInventoryItem>(
        PATHS.DETAIL(inventoryId),
      )
      return data
    },
  })
