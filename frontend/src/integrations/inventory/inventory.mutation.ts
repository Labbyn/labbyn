import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import api from '@/lib/api'

const PATHS = {
  BASE: '/db/inventory/',
  DETAIL: (id: string | number) => `/db/inventory/${id}`,
}

export const useUpdateInventoryMutation = (itemId: string | number) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (updateData: any) => {
      const { data } = await api.put(PATHS.DETAIL(itemId), updateData)
      return data
    },
    onSuccess: () => {
      toast.success('Inventory item updated')
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['inventory', String(itemId)] })
    },
  })
}

export const useDeleteInventoryMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (itemId: string | number) => {
      await api.delete(PATHS.DETAIL(itemId))
    },
    onSuccess: () => {
      toast.success('Item removed from inventory')
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
    },
  })
}
