import { queryOptions } from '@tanstack/react-query'
import { fetchInventoryData } from './inventory.adapter'
import type { ApiInventoryResponse } from './inventory.types'

const INVENTORY_ENDPOINT = `http://${import.meta.env.VITE_API_URL}/db/inventory`

export const inventoryQueryOptions = queryOptions({
  queryKey: ['inventory', 'list'],
  queryFn: async () => {
    const res = await fetch(INVENTORY_ENDPOINT)
    if (!res.ok) throw new Error('Failed to fetch inventory')

    const data: ApiInventoryResponse = await res.json()
    return fetchInventoryData(data)
  },
})


export const inventoryItemQueryOptions = (inventoryId: string) =>
  queryOptions({
    queryKey: ['inventory', 'item'],
    queryFn: async () => {
      const res = await fetch(`${INVENTORY_ENDPOINT}/${inventoryId}`)
      if (!res.ok) throw new Error('Failed to fetch inventory')

      const data: ApiInventoryItem = await res.json()
      return fetchInventoryData(data)
    },
  })
