import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { z } from 'zod'
import { CanvasComponent3D } from '../../components/canvas'
import type { Equipment, Wall } from '@/types/types'
import { generateDefaultLabLoadout } from '@/lib/sample-lab-gen'

const mapSearchSchema = z.object({
  redirectType: z.enum(['rack', 'machine', 'lab']).optional(),
  redirectId: z.union([z.string(), z.number()]).optional(),
})

export type MapSearch = z.infer<typeof mapSearchSchema>

export const Route = createFileRoute('/_auth/map')({
  component: App,
  validateSearch: mapSearchSchema,
})

function App() {
  const defaultLoadout = generateDefaultLabLoadout()
  const [equipment] = useState<Array<Equipment>>(defaultLoadout.equipment)
  const [walls] = useState<Array<Wall>>(defaultLoadout.walls)
  const { redirectId } = Route.useSearch()
  return (
    <div className="h-screen w-full bg-background flex flex-col overflow-hidden">
      <div className="flex flex-1 min-w-0 overflow-hidden">
        <CanvasComponent3D
          equipment={equipment}
          walls={walls}
          initialSelectedId={redirectId?.toString()}
        />
      </div>
    </div>
  )
}
