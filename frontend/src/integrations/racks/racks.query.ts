import { queryOptions } from '@tanstack/react-query'
import type {
  ApiRackDetailItem,
  ApiRackListResponse,
  ApiRacksList,
} from './racks.types'
import api from '@/lib/api'

const PATHS = {
  BASE: '/db/racks',
  LIST: `/db/racks-list`,
  SINGLE: (id: string) => `/db/racks/rack_info/${id}`,
}

// Fetch rack base list
export const racksBaseListQueryOptions = queryOptions({
  queryKey: ['racks', 'list', 'base'],
  queryFn: async () => {
    const { data } = await api.get<ApiRackListResponse>(PATHS.BASE)
    return data
  },
})

// Fetch rack list
export const racksListQueryOptions = queryOptions({
  queryKey: ['racks', 'list'],
  queryFn: async () => {
    const { data } = await api.get<ApiRacksList>(PATHS.LIST)
    return data
  },
})

// Fetch single rack by ID
export const singleRackQueryOptions = (rackId: string) =>
  queryOptions({
    queryKey: ['rack', rackId],
    queryFn: async () => {
      const { data } = await api.get<ApiRackDetailItem>(PATHS.SINGLE(rackId))
      return data
    },
  })
