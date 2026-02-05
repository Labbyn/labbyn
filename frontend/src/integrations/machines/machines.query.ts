import { queryOptions } from '@tanstack/react-query'
import type { ApiMachineResponse } from './machines.types'
import api from '@/lib/api'

const PATHS = {
  BASE: '/db/machines',
}

export const machinesQueryOptions = queryOptions({
  queryKey: ['machines'],
  queryFn: async () => {
    const { data } = await api.get<ApiMachineResponse>(PATHS.BASE)
    return data
  },
})
