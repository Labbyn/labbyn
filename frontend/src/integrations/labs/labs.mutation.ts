import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

const PATHS = {
  BASE: '/db/rooms',
  DETAIL: (id: number) => `/db/rooms/${id}`,
}

export async function useCreateLabMutation(labData: {
  name: string
  room_type: string
  team_id: number
  tag_ids?: Array<string>
}) {
  const { data } = await api.post(PATHS.BASE, labData)
  return data
}

export const useDeleteLabMutation = (labId: number) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ['delete-lab'],
    mutationFn: () => api.delete(PATHS.DETAIL(labId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labs'] })
    },
  })
}
