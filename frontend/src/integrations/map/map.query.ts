import { useQuery } from '@tanstack/react-query'
import { adaptMapToFrontend } from './map.adapter'
import type { MapResponse } from './map.types'
import api from '@/lib/api'

export const mapQueryKeys = {
  all: ['map'] as const,
  room: (roomId: string | number) =>
    [...mapQueryKeys.all, 'room', roomId] as const,
}

export const useRoomMap = (roomId: string | number) => {
  return useQuery({
    queryKey: mapQueryKeys.room(roomId),
    queryFn: async () => {
      try {
        const response = await api.get<MapResponse>(`/rooms/${roomId}/map`)
        return adaptMapToFrontend(response.data)
      } catch (error: any) {
        // If the backend returns 404 (Not Found), the room simply has no map yet.
        // Return an empty frontend payload so the user can start building a new map.
        if (error?.response?.status === 404 || error?.status === 404) {
          return {
            equipment: [],
            wallNodes: [],
            wallSegments: [],
            labels: [],
          }
        }
        // Rethrow for genuine 500 server errors
        throw error
      }
    },
    enabled: !!roomId,
    retry: (failureCount, error: any) => {
      // Do not retry on 404s, as it's an expected "empty" state
      if (error?.response?.status === 404 || error?.status === 404) return false
      return failureCount < 3
    },
  })
}
