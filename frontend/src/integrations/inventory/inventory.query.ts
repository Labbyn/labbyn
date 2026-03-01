import { queryOptions } from '@tanstack/react-query'
import type {
  ApiInventoryInfoItem,
  ApiInventoryInfoResponse,
  ApiInventoryItem,
  ApiInventoryResponse,
} from './inventory.types'
import api from '@/lib/api'

const PATHS = {
  BASE: '/db/inventory',
  DETAIL: (id: string) => `/db/inventory/${id}`,
  INFO: '/db/inventory/details',
  SINGLE_INFO: (id: string) => `/db/inventory/details/${id}`,
}

// Fetch full inventory list
export const inventoryQueryOptions = queryOptions({
  queryKey: ['inventory', 'list'],
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

// Fetch full inventory info list
export const inventoryInfoQueryOptions = queryOptions({
  queryKey: ['inventory', 'list', 'info'],
  queryFn: async () => {
    const { data } = await api.get<ApiInventoryInfoResponse>(PATHS.INFO)
    return data
  },
})

// Fetch single inventory item info by ID
export const inventoryItemInfoQueryOptions = (inventoryId: string) =>
  queryOptions({
    queryKey: ['inventory', inventoryId, 'info'],
    queryFn: async () => {
      const { data } = await api.get<ApiInventoryInfoItem>(
        PATHS.SINGLE_INFO(inventoryId),
      )
      return data
    },
  })
