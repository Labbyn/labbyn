import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { ApiShelfCreate, ApiShelfUpdate } from './shelves.types'
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
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
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

export function useUpdateShelvesOrderMutation(rackId: string | number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ['update-shelves-order', rackId],
    mutationFn: async (updates: Array<{ id: number; order: number }>) => {
      const promises = updates.map((shelf) =>
        api.patch(PATHS.DETAIL(shelf.id), {
          order: shelf.order,
        } as ApiShelfUpdate),
      )
      return Promise.all(promises)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shelf', String(rackId)] })
      queryClient.invalidateQueries({ queryKey: ['racks', 'list', 'base'] })
    },
  })
}
