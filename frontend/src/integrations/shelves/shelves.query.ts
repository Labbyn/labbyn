import { queryOptions } from '@tanstack/react-query'
import type { ApiShelvesResponse } from './shelves.types'
import api from '@/lib/api'

const PATHS = {
  SINGLE: (id: string) => `/db/rack/${id}/all`,
}

// Fetch single shelf in rack
export const singleShelfQueryOptions = (rackId: string) =>
  queryOptions({
    queryKey: ['shelf', rackId],
    queryFn: async () => {
      const { data } = await api.get<ApiShelvesResponse>(PATHS.SINGLE(rackId))
      return data
    },
  })
