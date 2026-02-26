import { queryOptions } from '@tanstack/react-query'
import type { ApiRackDetailItem } from './racks.types'
import api from '@/lib/api'

const PATHS = {
  SINGLE: (id: string) => `/db/racks/rack_info/${id}`,
}

// Fetch single rack by ID
export const singleRackQueryOptions = (rackId: string) =>
  queryOptions({
    queryKey: ['rack', rackId],
    queryFn: async () => {
      const { data } = await api.get<ApiRackDetailItem>(PATHS.SINGLE(rackId))
      return data
    },
  })
