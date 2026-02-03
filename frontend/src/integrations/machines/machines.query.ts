import { queryOptions } from '@tanstack/react-query'
import { fetchMachinesData } from './machines.adapter'
import type { ApiMachineResponse } from './machines.adapter'

const MACHINES_ENDPOINT = `http://${import.meta.env.VITE_API_URL}/db/machines`

export const machineQueryOptions = queryOptions({
  queryKey: ['machine'],
  queryFn: async () => {
    const res = await fetch(MACHINES_ENDPOINT)
    if (!res.ok) throw new Error('Failed to fetch machines')

    const data: ApiMachineResponse = await res.json()
    return fetchMachinesData(data)
  },
})
