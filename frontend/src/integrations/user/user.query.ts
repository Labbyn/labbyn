import { queryOptions } from '@tanstack/react-query'
import { fetchUserData } from './user.adapter'
import type { ApiUserResponse } from './user.types'

const USER_ENDPOINT = `http://${import.meta.env.VITE_API_URL}/db/users/`

export const userQueryOptions = queryOptions({
  queryKey: ['user'],
  queryFn: async () => {
    const res = await fetch(USER_ENDPOINT)
    if (!res.ok) throw new Error('Failed to fetch users')

    const data: ApiUserResponse = await res.json()
    return fetchUserData(data)
  },
})
