import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import api from '@/lib/api'

const PATHS = {
  BASE: '/db/teams',
  DETAIL: (id: string | number) => `/db/teams/${id}`,
}

export const useCreateTeamMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (teamData: {
      name: string
      team_admin_id: number | null
    }) => {
      const { data } = await api.post(PATHS.BASE, teamData)
      return data
    },
    onSuccess: () => {
      toast.success('Team created successfully')
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      queryClient.invalidateQueries({ queryKey: ['labs'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export const useUpdateTeamMutation = (teamId: string | number) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (
      teamData: Partial<{ name: string; team_admin_id: Array<number> }>,
    ) => {
      const { data } = await api.patch(PATHS.DETAIL(teamId), teamData)
      return data
    },
    onSuccess: () => {
      toast.success('Team updated successfully')
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      queryClient.invalidateQueries({
        queryKey: ['teams', 'info', String(teamId)],
      })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['labs'] })
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
      queryClient.invalidateQueries({ queryKey: ['labs'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
