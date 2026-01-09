import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { CanvasComponent3D } from '../../components/canvas'
import type { Equipment, Wall } from '../../components/canvas'
import { generateDefaultLabLoadout } from '@/lib/sample-lab-gen'

export const Route = createFileRoute('/_auth/')({
  component: App,
})

function App() {
  const defaultLoadout = generateDefaultLabLoadout()
  const [equipment] = useState<Array<Equipment>>(defaultLoadout.equipment)
  const [walls] = useState<Array<Wall>>(defaultLoadout.walls)
  return (
    <div className="h-screen w-full bg-background flex flex-col overflow-hidden">
      <div className="flex flex-1 min-w-0 overflow-hidden">
        <CanvasComponent3D equipment={equipment} walls={walls} />
      </div>
    </div>
  )
}
