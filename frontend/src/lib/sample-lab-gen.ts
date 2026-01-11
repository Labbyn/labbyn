import type { Equipment, Wall } from '@/types/types'

export function generateDefaultLabLoadout() {
  const equipment: Array<Equipment> = []
  const walls: Array<Wall> = []

  // Konfiguracja
  const HALL_ROWS = 3 // Ilość hal w pionie
  const HALL_COLS = 3 // Ilość hal w poziomie

  const ROOM_WIDTH = 2200 // Szerokość jednej hali
  const ROOM_HEIGHT = 1400 // Wysokość jednej hali
  const GAP_X = 400 // Odstęp między halami (korytarze poziome)
  const GAP_Y = 400 // Odstęp między halami (korytarze pionowe)

  // Helper do ścian
  const addWall = (x1: number, y1: number, x2: number, y2: number) => {
    walls.push({
      id: `w-${Math.random().toString(36).substr(2, 9)}`,
      x1,
      y1,
      x2,
      y2,
    })
  }

  // Generowanie całego Kampusu
  for (let hRow = 0; hRow < HALL_ROWS; hRow++) {
    for (let hCol = 0; hCol < HALL_COLS; hCol++) {
      // Offset dla całego pokoju
      const roomOffsetX = hCol * (ROOM_WIDTH + GAP_X)
      const roomOffsetY = hRow * (ROOM_HEIGHT + GAP_Y)

      const hallType =
        (hRow + hCol) % 3 === 0
          ? 'quantum'
          : (hRow + hCol) % 2 === 0
            ? 'gpu-cluster'
            : 'server'
      const prefix = `H${hRow}${hCol}`

      // --- GENEROWANIE RACKÓW W HALI ---
      // Siatka racków wewnątrz pokoju
      const rackRows = 12
      const rackCols = 10
      const rackSpacingX = 160 // Większy odstęp boczny
      const rackSpacingY = 100 // Większy odstęp między rzędami

      const innerMarginX = 200
      const innerMarginY = 200

      for (let r = 0; r < rackRows; r++) {
        // Pomijamy środek pokoju na główne przejście
        if (r === 5 || r === 6) continue

        for (let c = 0; c < rackCols; c++) {
          const x = roomOffsetX + innerMarginX + c * rackSpacingX
          const y = roomOffsetY + innerMarginY + r * rackSpacingY

          equipment.push({
            id: `${prefix}-R${r}-C${c}`,
            type: hallType,
            x,
            y,
            label: `${hallType.toUpperCase().slice(0, 3)}-${hRow}${hCol}-${r}${c}`,
          })
        }
      }

      // --- ŚCIANY POKOJU ---
      // Obrys
      const wx1 = roomOffsetX
      const wy1 = roomOffsetY
      const wx2 = roomOffsetX + ROOM_WIDTH
      const wy2 = roomOffsetY + ROOM_HEIGHT

      // Góra
      addWall(wx1, wy1, wx2, wy1)
      // Dół
      addWall(wx1, wy2, wx2, wy2)
      // Lewo (z dziurą na przejście jeśli nie pierwszy)
      if (hCol > 0) {
        addWall(wx1, wy1, wx1, wy1 + ROOM_HEIGHT / 2 - 100)
        addWall(wx1, wy1 + ROOM_HEIGHT / 2 + 100, wx1, wy2)
        // Łącznik korytarza
        addWall(
          wx1 - GAP_X,
          wy1 + ROOM_HEIGHT / 2 - 100,
          wx1,
          wy1 + ROOM_HEIGHT / 2 - 100,
        )
        addWall(
          wx1 - GAP_X,
          wy1 + ROOM_HEIGHT / 2 + 100,
          wx1,
          wy1 + ROOM_HEIGHT / 2 + 100,
        )
      } else {
        addWall(wx1, wy1, wx1, wy2)
      }

      // Prawo (z dziurą na przejście jeśli nie ostatni)
      if (hCol < HALL_COLS - 1) {
        addWall(wx2, wy1, wx2, wy1 + ROOM_HEIGHT / 2 - 100)
        addWall(wx2, wy1 + ROOM_HEIGHT / 2 + 100, wx2, wy2)
      } else {
        addWall(wx2, wy1, wx2, wy2)
      }
    }
  }

  return {
    equipment,
    walls,
  }
}
