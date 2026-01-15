import { queryOptions } from '@tanstack/react-query'
import { fetchInventoryData } from './inventory.adapter'
import type { ApiInventoryResponse } from './inventory.types'

const INVENTORY_ENDPOINT = `http://${import.meta.env.VITE_API_URL}/db/inventory`

export const inventoryQueryOptions = queryOptions({
  queryKey: ['inventory'],
  queryFn: async () => {
    const res = await fetch(INVENTORY_ENDPOINT)
    if (!res.ok) {
      throw new Error('Failed to fetch inventory')
    }

    const data: ApiInventoryResponse = await res.json()
    return fetchInventoryData(data)
  },
})
