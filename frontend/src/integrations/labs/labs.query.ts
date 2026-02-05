import { queryOptions } from '@tanstack/react-query'
import type { ApiLabsResponse } from './labs.types'
import api from '@/lib/api'

const PATHS = {
  BASE: '/labs',
}

export const labsQueryOptions = queryOptions({
  queryKey: ['labs'],
  queryFn: async () => {
    const { data } = await api.get<ApiLabsResponse>(PATHS.BASE)
    return data
  },
})
