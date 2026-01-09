import { Canvas } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { Grid, OrbitControls } from '@react-three/drei'
import { ChevronDown, Pencil } from 'lucide-react'
import { Color, Object3D } from 'three'
import { Button } from './ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { ScrollArea } from './ui/scroll-area'
import { Card, CardFooter, CardHeader, CardTitle } from './ui/card'
import type { InstancedMesh } from 'three'
import type { Equipment, Wall } from '@/types/types'
import { infrastructureData } from '@/lib/mock-data'

interface Canvas3DProps {
  equipment: Array<Equipment>
  walls: Array<Wall>
}

const COLORS = [
  '#e63946',
  '#f1faee',
  '#a8dadc',
  '#457b9d',
  '#1d3557',
  '#ffb703',
  '#fb8500',
  '#2a9d8f',
  '#e9c46a',
  '#264653',
]

function EquipmentInstances({ equipment }: { equipment: Array<Equipment> }) {
  // Use specific type InstancedMesh instead of THREE.InstancedMesh
  const meshRef = useRef<InstancedMesh>(null)
  const count = equipment.length
  const size = 5
  const height = 2

  const tempObject = useMemo(() => new Object3D(), [])
  const tempColor = useMemo(() => new Color(), [])

  useLayoutEffect(() => {
    if (!meshRef.current) return

    equipment.forEach((item, index) => {
      // Position
      tempObject.position.set(item.x / 10, height / 2, item.y / 10)
      tempObject.updateMatrix()
      meshRef.current!.setMatrixAt(index, tempObject.matrix)

      // Color
      const colorHex = COLORS[index % COLORS.length]
      tempColor.set(colorHex)
      meshRef.current!.setColorAt(index, tempColor)
    })

    meshRef.current.instanceMatrix.needsUpdate = true
    if (meshRef.current.instanceColor)
      meshRef.current.instanceColor.needsUpdate = true
  }, [equipment, tempObject, tempColor])

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <boxGeometry args={[size, height, size]} />
      <meshStandardMaterial />
    </instancedMesh>
  )
}

function Wall3D({ wall }: { wall: Wall }) {
  const x1 = wall.x1 / 10
  const y1 = wall.y1 / 10
  const x2 = wall.x2 / 10
  const y2 = wall.y2 / 10

  const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
  const angle = Math.atan2(y2 - y1, x2 - x1)
  const cx = (x1 + x2) / 2
  const cy = (y1 + y2) / 2

  return (
    <mesh position={[cx, 1.5, cy]} rotation={[0, angle, 0]}>
      <boxGeometry args={[length || 0.4, 3, 0.4]} />
      <meshStandardMaterial color="#ff1d8d" />
    </mesh>
  )
}

function CanvasComponent3D({ equipment, walls }: Canvas3DProps) {
  return (
    <div className="flex-1 relative min-w-0 touch-none">
      <Canvas camera={{ position: [400, 50, 100], fov: 50 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 20, 10]} intensity={0.8} />
        <pointLight position={[0, 10, 0]} intensity={0.4} />

        <Grid
          args={[1000, 1000]}
          cellSize={5}
          cellColor="#6b7280"
          sectionSize={20}
          sectionColor="#1f2937"
          fadeDistance={500}
          fadeStrength={0.9}
        />

        <EquipmentInstances equipment={equipment} />

        {walls.map((wall) => (
          <Wall3D key={wall.id} wall={wall} />
        ))}

        <OrbitControls
          autoRotate={false}
          zoomToCursor={true}
          screenSpacePanning={true}
        />
      </Canvas>

      <div className="absolute bottom-5 left-5 text-secondary bg-primary px-4 py-2 rounded-md text-sm">
        LMB to rotate, Scroll to zoom, RMB to pan
      </div>
      <div className="absolute flex top-5 left-5 text-secondary p-4 gap-4 rounded-md">
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Button>
              Networking Testbed
              <ChevronDown />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Rocket Lab</DropdownMenuItem>
            <DropdownMenuItem>Quantum tests</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Button>
              Layout 1 <ChevronDown />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Layout 2</DropdownMenuItem>
            <DropdownMenuItem>Layout 3</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button>
          Edit layout
          <Pencil />
        </Button>
      </div>
      <div className="absolute top-5 right-5 h-full ">
        <ScrollArea className="h-4/5 w-72 rounded-md">
          {infrastructureData.map((lab) =>
            lab.racks.map((rack) => (
              <div className="p-1">
                <Card>
                  <CardHeader>
                    <CardTitle>{rack.id}</CardTitle>
                  </CardHeader>
                  <CardFooter>Devices: {rack.devices.length}</CardFooter>
                </Card>
              </div>
            )),
          )}
        </ScrollArea>
      </div>
    </div>
  )
}

export { CanvasComponent3D, type Equipment, type Wall }
