import { queryOptions } from '@tanstack/react-query'
import type { ApiUserItem, ApiUserResponse } from './user.types'
import api from '@/lib/api'

const PATHS = {
  BASE: '/db/users',
  SINGLE: (id: string) => `/db/users/${id}`,
}

// Fetch all users
export const usersQueryOptions = queryOptions({
  queryKey: ['users'],
  queryFn: async () => {
    const { data } = await api.get<ApiUserResponse>(PATHS.BASE)
    return data
  },
})

// Fetch single user by id
export const singleUserQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ['users', userId],
    queryFn: async () => {
      const { data } = await api.get<ApiUserItem>(PATHS.SINGLE(userId))
      return data
    },
  })
