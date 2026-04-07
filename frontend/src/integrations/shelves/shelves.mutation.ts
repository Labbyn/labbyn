import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { ApiShelfCreate } from './shelves.types'
import api from '@/lib/api'

const PATHS = {
  BASE: '/db/shelf',
  DETAIL: (id: number) => `/db/shelf/${id}`,
}

export function useCreateShelfMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ['create-shelf'],
    mutationFn: ({
      rackId,
      shelfData,
    }: {
      rackId: number
      shelfData: ApiShelfCreate
    }) => api.post(PATHS.DETAIL(rackId), shelfData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] })
      queryClient.invalidateQueries({ queryKey: ['shelf'] })
      queryClient.invalidateQueries({ queryKey: ['racks', 'list', 'base'] })
    },
  })
}

export function useDeleteShelfMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ['delete-shelf'],
    mutationFn: ({ shelfId }: { shelfId: number }) =>
      api.delete(PATHS.DETAIL(shelfId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] })
      queryClient.invalidateQueries({ queryKey: ['shelf'] })
      queryClient.invalidateQueries({ queryKey: ['racks', 'list', 'base'] })
    },
  })
}
