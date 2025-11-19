import type { Equipment, Wall } from '@/components/canvas'

export function generateDefaultLabLoadout() {
  const equipment: Array<Equipment> = []
  const walls: Array<Wall> = []

  const roomWidth = 4000
  const roomHeight = 550
  // const serverSpacing = 40
  // const rackHeight = 40

  let serverId = 0
  for (let row = 0; row < 10; row++) {
    for (let rack = 0; rack < 20; rack++) {
      const x = 25 + rack * 200
      const y = 25 + row * 50

      equipment.push({
        id: `server-${serverId++}`,
        type: 'server',
        x,
        y,
        label: `Server-${serverId}`,
      })

      if (serverId >= 1000) break
    }
    if (serverId >= 1000) break
  }

  walls.push(
    { id: 'wall-top', x1: 0, y1: 0, x2: roomWidth, y2: 0 },
    { id: 'wall-bottom', x1: 0, y1: roomHeight, x2: roomWidth, y2: roomHeight },
    { id: 'wall-left', x1: 0, y1: 0, x2: 0, y2: roomHeight },
    { id: 'wall-right', x1: roomWidth, y1: 0, x2: roomWidth, y2: roomHeight },
  )

  // const wallThickness = 40

  for (let i = 1; i < 5; i++) {
    walls.push({
      id: `wall-v-${i}`,
      x1: i * 900,
      y1: 0,
      x2: i * 900,
      y2: 500,
    })
  }

  return {
    equipment,
    walls,
  }
}
