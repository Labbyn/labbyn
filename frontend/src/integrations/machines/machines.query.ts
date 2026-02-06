import { queryOptions } from '@tanstack/react-query'
import type { ApiMachineItem, ApiMachineResponse } from './machines.types'
import api from '@/lib/api'

const PATHS = {
  BASE: '/db/machines',
  SINGLE: (id: string) => `/db/machines/${id}`,
}

// Fetch all machines
export const machinesQueryOptions = queryOptions({
  queryKey: ['machines'],
  queryFn: async () => {
    const { data } = await api.get<ApiMachineResponse>(PATHS.BASE)
    return data
  },
})

// Fetch single machine by id
export const machineSpecQueryOptions = (machineId: string) =>
  queryOptions({
    queryKey: ['machines', 'spec', machineId],
    queryFn: async () => {
      const { data } = await api.get<ApiMachineItem>(PATHS.SINGLE(machineId))
      return data
    },
  })
