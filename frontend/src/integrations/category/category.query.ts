import { queryOptions } from '@tanstack/react-query'
import type { ApiCategoryItem, ApiCategoryResponse } from './category.types'
import api from '@/lib/api'

const PATHS = {
  LIST: `/db/categories`,
  SINGLE: (id: string) => `/db/racks/rack_info/${id}`,
}

// Fetch category list
export const categoryListQueryOptions = queryOptions({
  queryKey: ['categoriers', 'list'],
  queryFn: async () => {
    const { data } = await api.get<ApiCategoryResponse>(PATHS.LIST)
    return data
  },
})

// Fetch single category by ID
export const singleCategoryQueryOptions = (categoryId: string) =>
  queryOptions({
    queryKey: ['categoriers', categoryId],
    queryFn: async () => {
      const { data } = await api.get<ApiCategoryItem>(PATHS.SINGLE(categoryId))
      return data
    },
  })
