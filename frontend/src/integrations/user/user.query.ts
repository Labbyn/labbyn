import { queryOptions } from '@tanstack/react-query'
import type { UserRead } from './user.types'
import api from '@/lib/api'

const PATHS = {
  BASE: '/db/users/',
  ME: '/users/me',
  SINGLE: (id: string | number) => `/db/users/${id}`,
}

export const currentUserQueryOptions = queryOptions({
  queryKey: ['users', 'me'],
  queryFn: async () => {
    const { data } = await api.get<UserRead>(PATHS.ME)
    return data
  },
})

export const usersQueryOptions = queryOptions({
  queryKey: ['users', 'list'],
  queryFn: async () => {
    const { data } = await api.get<Array<UserRead>>(PATHS.BASE)
    return data
  },
})

export const singleUserQueryOptions = (userId: string | number) =>
  queryOptions({
    queryKey: ['users', String(userId)],
    queryFn: async () => {
      const { data } = await api.get<UserRead>(PATHS.SINGLE(userId))
      return data
    },
  })
