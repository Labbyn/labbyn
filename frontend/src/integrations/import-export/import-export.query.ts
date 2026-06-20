import { queryOptions } from '@tanstack/react-query'
import api from '@/lib/api'

const PATHS = {
  EXPORT: (entityType: string) => `/db/export/${entityType}`,
}

export const exportDataQueryOptions = (entityType: string) =>
  queryOptions({
    queryKey: ['export', entityType],
    queryFn: async () => {
      const { data } = await api.get(PATHS.EXPORT(entityType), {
        responseType: 'blob',
      })
      return data
    },
  })
