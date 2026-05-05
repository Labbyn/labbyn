import { queryOptions } from '@tanstack/react-query'
import type { ApiRentalsItemResponse } from './rentals.types'
import api from '@/lib/api'

const PATHS = {
  BASE: '/db/rentals',
  INVENTORY: (id: string) => `/db/rentals/item/${id}`
}

// Fetch all rentals
export const rentalsQueryOptions = queryOptions({
  queryKey: ['rentals', 'list'],
  queryFn: async () => {
    const { data } = await api.get<ApiRentalsItemResponse>(PATHS.BASE)
    return data
  },
})

//Fetch all invenotry item rentals
export const rentalsInventoryItemQueryOptions = (itemId: string | number) =>
  queryOptions({
    queryKey: ['invenotry', String(itemId)],
    queryFn: async () => {
      const { data } = await api.get<ApiRentalsItem>(PATHS.INVENTORY(itemId))
      return data
    },
  })

