import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { ApiUpdateInventory } from './inventory.types'
import api from '@/lib/api'

const PATHS = {
  BASE: '/db/inventory',
  DETAIL: (id: string | number) => `/db/inventory/${id}`,
}

export async function useCreateInventoryItemMutation(invData: {
  name: string
  quantity: number
  localization_id: number
  category_id: number
  team_id: number
  rental_status: boolean
}) {
  const { data } = await api.post(PATHS.BASE, invData)
  return data
}

export const useUpdateInventoryMutation = (itemId: string | number) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ['update-item'],
    mutationFn: async (updateData: ApiUpdateInventory) => {
      await api.patch(PATHS.DETAIL(itemId), updateData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['inventory', String(itemId)] })
    },
  })
}

export const useDeleteInventoryMutation = (itemId: string | number) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ['delete-item'],
    mutationFn: async () => {
      await api.delete(PATHS.DETAIL(itemId))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
