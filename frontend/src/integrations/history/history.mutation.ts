// integrations/history/history.mutation.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import api from '@/lib/api'

const PATHS = {
  ROLLBACK: (id: number) => `/db/history/${id}/rollback`,
}

const rollbackChange = async (id: number) => {
  const { data } = await api.post(PATHS.ROLLBACK(id))
  return data
}

export const useRollbackMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: rollbackChange,
    onSuccess: () => {
      toast.success('System state rolled back successfully')
      queryClient.invalidateQueries({ queryKey: ['history'] })
    },
    onError: (err: any) => {
      const backendMessage =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'You do not have permission to perform this action (403)'

      toast.error(`Rollback Error: ${backendMessage}`)
    },
  })
}
