import api from '@/lib/api'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { ApiCategoryItem } from './category.types'

const PATHS = {
  BASE: '/db/categories',
  DETAIL: (id: number) => `/db/categories/${id}`,
}

export async function useCreateCategoryMutation(categoryData: {
  name: string
}) {
  const { data } = await api.post(PATHS.BASE, categoryData)
  return data
}

export const useDeletCategoryMutation = (categoryId: number) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ['delete-category'],
    mutationFn: () => api.delete(PATHS.DETAIL(categoryId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', 'list'] })
    },
  })
}

export const useUpdateCategoryMutation = (categoryId: number) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ['update-category'],
    mutationFn: (data: Partial<ApiCategoryItem> ) => api.patch(PATHS.DETAIL(categoryId), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', 'list'] })
    },
  })
}
