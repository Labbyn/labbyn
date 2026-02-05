import { queryOptions } from '@tanstack/react-query'
import type { ApiUserResponse } from './user.types'
import api from '@/lib/api'

const PATHS = {
  BASE: '/db/users',
}

export const usersQueryOptions = queryOptions({
  queryKey: ['users'],
  queryFn: async () => {
    const { data } = await api.get<ApiUserResponse>(PATHS.BASE)
    return data
  },
})
