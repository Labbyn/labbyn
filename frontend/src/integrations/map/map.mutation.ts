import { useMutation, useQueryClient } from '@tanstack/react-query'
import { adaptMapToBackend } from './map.adapter'
import { mapQueryKeys } from './map.query'
import type { FrontendMapData } from './map.adapter'
import api from '@/lib/api'

export const useSyncRoomMap = (roomId: string | number) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: FrontendMapData) => {
      const payload = adaptMapToBackend(data)
      const response = await api.patch(`/rooms/${roomId}/map`, payload)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mapQueryKeys.room(roomId) })
    },
  })
}
