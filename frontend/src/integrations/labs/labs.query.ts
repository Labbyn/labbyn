import { queryOptions } from '@tanstack/react-query'
import { fetchLabData, fetchLabsData } from './labs.adapter'
import type { ApiLabsItem, ApiLabsResponse } from './labs.types'

const LABS_ENDPOINT = `http://${import.meta.env.VITE_API_URL}/labs`

export const labsQueryOptions = queryOptions({
  queryKey: ['labs', 'list'],
  queryFn: async () => {
    const res = await fetch(LABS_ENDPOINT)
    if (!res.ok) throw new Error('Failed to fetch labs')

    const data: ApiLabsResponse = await res.json()
    return fetchLabsData(data)
  },
})

export const labQueryOptions = (labId: string) =>
  queryOptions({
    queryKey: ['labs', 'single'],
    queryFn: async () => {
      const res = await fetch(`${LABS_ENDPOINT}/${labId}`)
      if (!res.ok) throw new Error('Failed to fetch labs')

      const data: ApiLabsItem = await res.json()
      return fetchLabData(data)
    },
  })
