import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { UserCreate, UserCreatedResponse, UserUpdate } from './user.types'
import api from '@/lib/api'

const PATHS = {
  BASE: '/db/users/',
  DETAIL: (id: string | number) => `/db/users/${id}`,
  AUTH_RESET_PASSWORD: (id: string | number) => `/auth/reset-password/${id}`,
  CHANGE_TEAM_ACCESS: (id: string | number) =>
    `/db/users/${id}/change_team_access`,
}

export const useCreateUserMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (userData: UserCreate) => {
      const { data } = await api.post<UserCreatedResponse>(PATHS.BASE, userData)
      return data
    },
    onSuccess: (data) => {
      toast.success(`User created. Login: ${data.login}`)
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

export const useUpdateUserMutation = (userId: string | number) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (userData: UserUpdate) => {
      const { data } = await api.patch(PATHS.DETAIL(userId), userData)
      return data
    },
    onSuccess: () => {
      toast.success('User updated successfully')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['users', String(userId)] })
    },
  })
}

export const useDeleteUserMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (userId: string | number) => {
      await api.delete(PATHS.DETAIL(userId))
    },
    onSuccess: () => {
      toast.success('User deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

export const useResetUserPasswordMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (userId: string | number) => {
      const { data } = await api.post<{
        message: string
        login: string
        password: string
      }>(PATHS.AUTH_RESET_PASSWORD(userId))
      return data
    },
    onSuccess: () => {
      toast.success('Password reset successfully')
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

export const useChangeUserTeamAccessMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      userId,
      data,
    }: {
      userId: number
      data: { team_id: number; is_group_admin: boolean }
    }) => {
      const response = await api.patch(PATHS.CHANGE_TEAM_ACCESS(userId), data)
      return response.data
    },
    onSuccess: () => {
      toast.success('User team access updated')
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}
