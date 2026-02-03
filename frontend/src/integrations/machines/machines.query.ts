import { queryOptions } from '@tanstack/react-query'
import { fetchMachineData, fetchMachinesData } from './machines.adapter'
import type { ApiMachineResponse } from './machines.adapter'
import type { ApiMachineItem } from './machines.types'

const MACHINES_ENDPOINT = `http://${import.meta.env.VITE_API_URL}/db/machines`

export const machineQueryOptions = queryOptions({
  queryKey: ['machine', 'list'],
  queryFn: async () => {
    const res = await fetch(MACHINES_ENDPOINT)
    if (!res.ok) throw new Error('Failed to fetch machines')

    const data: ApiMachineResponse = await res.json()
    return fetchMachinesData(data)
  },
})

export const machineSpecQueryOptions = (machineId: string) =>
  queryOptions({
    queryKey: ['machine', 'spec'],
    queryFn: async () => {
      const res = await fetch(`${MACHINES_ENDPOINT}/${machineId}`)
      if (!res.ok) throw new Error('Failed to fetch machines')

      const data: ApiMachineItem = await res.json()
      return fetchMachineData(data)
    },
  })
