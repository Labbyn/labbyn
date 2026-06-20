import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { AssignDetachTagForm, TagItem} from './tags.types'
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
      queryClient.invalidateQueries({ queryKey: ['machines'] })
      queryClient.invalidateQueries({ queryKey: ['racks'] })
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
      queryClient.invalidateQueries({ queryKey: ['machines'] })
      queryClient.invalidateQueries({ queryKey: ['racks'] })
    },
  })
}

export const useDeletTagMutation = (tagId: number) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ['delete-tag'],
    mutationFn: () => api.delete(PATHS.DETAIL(tagId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags', 'list'] })
    },
  })
}

export const useUpdateTagMutation = (tagId: number) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ['update-tag'],
    mutationFn: (data: Partial<TagItem> ) =>
      api.patch(PATHS.DETAIL(tagId), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags', 'list'] })
    },
  })
}
