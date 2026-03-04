import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { AssignDetachTagForm } from './tags.types'
import api from '@/lib/api'

const PATHS = {
  BASE: '/db/tags',
  DETAIL: (id: number) => `/db/tags/${id}`,
  ASSIGN: '/db/tags/assign',
  DETACH: '/db/tags/detach',
}

export async function useCreateTagMutation(tagData: {
  name: string
  color: string
}) {
  const { data } = await api.post(PATHS.BASE, tagData)
  return data
}

export function useAttachTagMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ['attach-tags'],
    mutationFn: (tagData: AssignDetachTagForm) =>
      api.post(PATHS.ASSIGN, tagData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines', 'spec', 'info'] })
    },
  })
}

export function useDetachTagMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ['detach-tags'],
    mutationFn: (tagData: AssignDetachTagForm) =>
      api.post(PATHS.DETACH, tagData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines', 'spec', 'info'] })
    },
  })
}
