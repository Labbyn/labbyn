import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { UserCreate, UserCreatedResponse, UserUpdate } from './user.types'
import api from '@/lib/api'

const PATHS = {
  BASE: '/db/users/',
  DETAIL: (id: string | number) => `/db/users/${id}`,
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
    onError: () => {
      toast.error('Failed to create user')
    },
  })
}

export const useUpdateUserMutation = (userId: string | number) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (userData: UserUpdate) => {
      const { data } = await api.put(PATHS.DETAIL(userId), userData)
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
