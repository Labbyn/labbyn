import { queryOptions } from '@tanstack/react-query'
import type { ApiCategoryItem, ApiCategoryResponse, ApiCategoryInventoryGrouped } from './category.types'
import api from '@/lib/api'

const PATHS = {
  LIST: `/db/categories`,
  SINGLE: (id: string) => `/db/categories/${id}`,
  GROUPED: '/db/categories/grouped'
}

// Fetch category list
export const categoryListQueryOptions = queryOptions({
  queryKey: ['categories', 'list'],
  queryFn: async () => {
    const { data } = await api.get<ApiCategoryResponse>(PATHS.LIST)
    return data
  },
})

// Fetch single category by ID
export const singleCategoryQueryOptions = (categoryId: string) =>
  queryOptions({
    queryKey: ['categories', categoryId],
    queryFn: async () => {
      const { data } = await api.get<ApiCategoryItem>(PATHS.SINGLE(categoryId))
      return data
    },
  })

export const categoryGroupedInventoryListQueryOptions = queryOptions({
  queryKey: ['categories', 'list', 'invenory'],
  queryFn: async () => {
    const { data } = await api.get<ApiCategoryInventoryGroupedResponse>(PATHS.GROUPED)
    return data
  },
})
