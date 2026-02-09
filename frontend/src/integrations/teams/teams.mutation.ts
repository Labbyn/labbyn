import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import api from '@/lib/api'

const PATHS = {
  BASE: '/db/teams/',
  DETAIL: (id: number) => `/db/teams/${id}`,
}

export const useCreateTeamMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (teamData: { name: string; team_admin_id: number }) => {
      const { data } = await api.post(PATHS.BASE, teamData)
      return data
    },
    onSuccess: () => {
      toast.success('Team created successfully')
      queryClient.invalidateQueries({ queryKey: ['teams'] })
    },
  })
}

export const useDeleteTeamMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (teamId: number) => {
      await api.delete(PATHS.DETAIL(teamId))
    },
    onSuccess: () => {
      toast.success('Team deleted')
      queryClient.invalidateQueries({ queryKey: ['teams'] })
    },
  })
}
