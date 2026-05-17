import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import api from '@/lib/api'

const PATHS = {
  BASE: '/db/rentals',
  DETAIL: (id: string | number) => `/db/rentals/${id}`,
}

export async function useCreateRentalMutation(rentData: {
  item_id: number
  quantity: number
  start_date: string
  end_date: string
  team_id: number
}) {
  const { data } = await api.post(PATHS.BASE, rentData)
  return data
}

export const useDeleteRentalMutation = (inventoryId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (rentId: number) => {
      await api.delete(PATHS.DETAIL(rentId))
    },
    onSuccess: () => {
      toast.success('Rental deleted')
      queryClient.invalidateQueries({
        queryKey: ['inventory', inventoryId, 'info'],
      })
    },
  })
}
