import { queryOptions } from '@tanstack/react-query'
import type { ApiTagsResponse } from './racks.types'
import api from '@/lib/api'

const PATHS = {
  BASE: `/db/tags`,
}

// Fetch all tags
export const tagsQueryOptions = queryOptions({
  queryKey: ['tags', 'list'],
  queryFn: async () => {
    const { data } = await api.get<ApiTagsResponse>(PATHS.BASE)
    return data
  },
})
