import { queryOptions } from '@tanstack/react-query'
import type { ApiUserInfo, UserRead } from './user.types'
import api from '@/lib/api'

const PATHS = {
  BASE: '/db/users/list_info',
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

export const adminUsersQueryOptions = queryOptions({
  queryKey: ['users', 'list', 'admin'],
  queryFn: async () => {
    const { data } = await api.get<Array<UserRead>>(PATHS.BASE)
    return data
  },
})

export const usersQueryOptions = queryOptions({
  queryKey: ['users', 'list'],
  queryFn: async () => {
    const { data } = await api.get<Array<ApiUserInfo>>(PATHS.BASE)
    return data
  },
})

export const singleUserQueryOptions = (userId: string | number) =>
  queryOptions({
    queryKey: ['users', String(userId)],
    queryFn: async () => {
      const { data } = await api.get<ApiUserInfo>(PATHS.SINGLE(userId))
      return data
    },
  })
