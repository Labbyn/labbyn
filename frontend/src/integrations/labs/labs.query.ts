import { queryOptions } from '@tanstack/react-query'
import type { ApiLabsItem, ApiLabsResponse } from './labs.types'
import api from '@/lib/api'

const PATHS = {
  BASE: '/labs',
  SINGLE: (id: string) => `/labs/${id}`,
}

// Fetch all labs
export const labsQueryOptions = queryOptions({
  queryKey: ['labs', 'list'],
  queryFn: async () => {
    const { data } = await api.get<ApiLabsResponse>(PATHS.BASE)
    return data
  },
})

// Fetch single lab by ID
export const labQueryOptions = (labId: string) =>
  queryOptions({
    queryKey: ['labs', labId],
    queryFn: async () => {
      const { data } = await api.get<ApiLabsItem>(PATHS.SINGLE(labId))
      return data
    },
  })
