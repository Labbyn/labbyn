import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { CanvasComponent3D } from '../../components/map/canvas'
import { useRoomMap } from '@/integrations/map/map.query'
import { labsBaseQueryOptions } from '@/integrations/labs/labs.query'
import { PageIsLoading } from '@/components/page-is-loading'

const mapSearchSchema = z.object({
  roomId: z.union([z.string(), z.number()]).default(1),
  redirectType: z.enum(['rack', 'machine', 'lab']).optional(),
  redirectId: z.union([z.string(), z.number()]).optional(),
})

export type MapSearch = z.infer<typeof mapSearchSchema>

export const Route = createFileRoute('/_auth/map')({
  component: App,
  validateSearch: mapSearchSchema,
})

function App() {
  const { redirectId, roomId } = Route.useSearch()
  const navigate = Route.useNavigate()

  const { data: rooms, isLoading: isLoadingRooms } =
    useQuery(labsBaseQueryOptions)
  const { data: mapData, isLoading: isLoadingMap } = useRoomMap(roomId)

  const handleRoomChange = (newRoomId: string) => {
    navigate({
      search: (prev) => ({
        ...prev,
        roomId: Number(newRoomId),
      }),
      replace: true,
    })
  }

  if (isLoadingMap || !mapData) {
    return <PageIsLoading />
  }

  return (
    <div className="h-screen w-full bg-background flex flex-col overflow-hidden">
      <div className="flex flex-1 min-w-0 overflow-hidden">
        <CanvasComponent3D
          key={roomId}
          roomId={roomId}
          rooms={Array.isArray(rooms) ? rooms : []}
          isLoadingRooms={isLoadingRooms}
          onRoomChange={handleRoomChange}
          initialEquipment={mapData.equipment}
          initialNodes={mapData.wallNodes}
          initialSegments={mapData.wallSegments}
          initialLabels={mapData.labels}
          initialSelectedId={redirectId?.toString()}
        />
      </div>
    </div>
  )
}
