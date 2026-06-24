import { queryOptions } from '@tanstack/react-query'
import type {
  ApiCategoryInventoryGroupedResponse,
  ApiCategoryItem,
  ApiCategoryResponse,
} from './category.types'
import api from '@/lib/api'

const PATHS = {
  LIST: `/db/categories`,
  SINGLE: (id: string) => `/db/categories/${id}`,
  GROUPED: '/db/categories/grouped',
}

// Fetch category list
export const categoryListQueryOptions = queryOptions({
  queryKey: ['categories', 'list'],
  queryFn: async () => {
    const { data } = await api.get<ApiCategoryResponse>(PATHS.LIST)
    if (Array.isArray(data)) {
      return data.sort((a, b) => a.id - b.id)
    }
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
  queryKey: ['categories', 'list', 'inventory'],
  queryFn: async () => {
    const { data } = await api.get<ApiCategoryInventoryGroupedResponse>(
      PATHS.GROUPED,
    )
    return data
  },
})
