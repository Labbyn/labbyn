import { Canvas, extend, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Billboard,
  ContactShadows,
  Environment,
  Grid,
  KeyboardControls,
  MapControls,
  OrthographicCamera,
  PerspectiveCamera,
  Stats,
  Text,
  useKeyboardControls,
} from '@react-three/drei'
import { RoundedBoxGeometry } from 'three-stdlib'
import {
  Box as BoxIcon,
  Map as MapIcon,
} from 'lucide-react'
import * as THREE from 'three'

import { formatHex } from 'culori'
import { RackInfoPanel } from './rack-info-panel'
import { ControlsOverlay } from './controls-overlay'
import type { Equipment, Wall } from '@/types/types'
import { Button } from '@/components/ui/button'


extend({ RoundedBoxGeometry })

interface Canvas3DProps {
  equipment: Array<Equipment>
  walls: Array<Wall>
}

const RACK_W = 8
const RACK_H = 16
const RACK_D = 5
const RADIUS = 0.25

function resolveColor(varName: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback
  const style = getComputedStyle(document.documentElement)
  const color = style.getPropertyValue(varName).trim()

  if (!color) return fallback

  const hex = formatHex(color)
  return hex || fallback
}

let cachedTexture: THREE.CanvasTexture | null = null
function getRackTexture(primaryColor: string) {
  if (cachedTexture) return cachedTexture
  if (typeof document === 'undefined') return null

  const width = 128
  const height = 512
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  ctx.fillStyle = '#111111'
  ctx.fillRect(0, 0, width, height)

  const units = 42
  const uH = height / units

  for (let i = 0; i < units; i++) {
    const y = i * uH
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, y, width, 1)
    ctx.fillStyle = '#222222'
    ctx.fillRect(2, y + 1, width - 4, uH - 2)

    if (Math.random() > 0.3) {
      ctx.fillStyle = primaryColor
      ctx.fillRect(width - 12, y + 5, 4, 3)
      if (Math.random() > 0.8) {
        ctx.fillStyle = '#ef4444'
        ctx.fillRect(width - 20, y + 5, 3, 3)
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  cachedTexture = tex
  return tex
}

function useThemeColors() {
  const [colors, setColors] = useState({
    background: '#000000',
    primary: '#3b82f6',
    border: '#333333',
    card: '#222222',
    wall: '#555555',
    rackBody: '#1e293b',
    grid: '#333333',
    text: '#ffffff',
  })

  useEffect(() => {
    const update = () => {
      const bg = resolveColor('--background', '#000000')
      const prim = resolveColor('--primary', '#3b82f6')
      const border = resolveColor('--border', '#333333')
      const card = resolveColor('--card', '#1a1a1a')
      const mutedFg = resolveColor('--muted-foreground', '#666666')
      const fg = resolveColor('--foreground', '#ffffff')

      setColors({
        background: bg,
        primary: prim,
        border: border,
        card: card,
        wall: mutedFg,
        rackBody: '#1e293b',
        grid: border,
        text: fg,
      })
    }

    update()
    const observer = new MutationObserver(update)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })
    return () => observer.disconnect()
  }, [])

  return colors
}

function SceneController({
  is2D,
  center,
}: {
  is2D: boolean
  center: THREE.Vector3
}) {
  const controlsRef = useRef<any>(null)
  const { camera, invalidate } = useThree()
  const [subscribe, getKeys] = useKeyboardControls()
  const vec = new THREE.Vector3()

  useEffect(() => {
    if (!controlsRef.current) return
    controlsRef.current.target.copy(center)
    if (!is2D) {
      camera.position.set(center.x + 100, 120, center.z + 100)
    } else {
      camera.position.set(center.x, 500, center.z)
    }
    controlsRef.current.update()
    invalidate()
  }, [center, is2D, camera, invalidate])

  useEffect(() => {
    return subscribe(() => invalidate())
  }, [invalidate, subscribe])

  useFrame(() => {
    if (!controlsRef.current) return
    const keys = getKeys()
    const moveSpeed = is2D ? 10 : 5
    const rotSpeed = 0.04

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(
      camera.quaternion,
    )
    forward.y = 0
    forward.normalize()
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion)
    right.y = 0
    right.normalize()

    vec.set(0, 0, 0)
    if (keys.forward) vec.add(forward)
    if (keys.back) vec.sub(forward)
    if (keys.right) vec.add(right)
    if (keys.left) vec.sub(right)

    let hasMoved = false

    if (vec.lengthSq() > 0) {
      vec.normalize().multiplyScalar(moveSpeed)
      controlsRef.current.target.add(vec)

      camera.position.add(vec)

      hasMoved = true
    }

    if (!is2D) {
      if (keys.rotateLeft) {
        const offset = camera.position.clone().sub(controlsRef.current.target)
        offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotSpeed)
        camera.position.copy(controlsRef.current.target).add(offset)
        camera.lookAt(controlsRef.current.target)
        hasMoved = true
      }
      if (keys.rotateRight) {
        const offset = camera.position.clone().sub(controlsRef.current.target)
        offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), -rotSpeed)
        camera.position.copy(controlsRef.current.target).add(offset)
        camera.lookAt(controlsRef.current.target)
        hasMoved = true
      }
    }

    if (hasMoved) {
      controlsRef.current.update()
      invalidate()
    }
  })

  return (
    <MapControls
      ref={controlsRef}
      makeDefault
      enableDamping={!is2D}
      dampingFactor={0.05}
      minDistance={75}
      maxDistance={750}
      enableZoom={true}
      screenSpacePanning={is2D}
      maxPolarAngle={Math.PI / 2 - 0.05}
      minPolarAngle={0}
    />
  )
}

function SelectionCursor({
  x,
  y,
  color,
}: {
  x: number
  y: number
  color: string
}) {
  const w = RACK_W + 3
  const h = RACK_H + 2
  const d = RACK_D + 3

  return (
    <group position={[x / 10, RACK_H / 2, y / 10]}>
      <mesh>
        <boxGeometry args={[w, h, d]} />
        <meshBasicMaterial color={color} wireframe />
      </mesh>
      <mesh position={[0, -h / 2 + 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w, d]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}

function InstancedRacks({ data, onSelect, colors }: any) {
  const bodyMeshRef = useRef<THREE.InstancedMesh>(null)
  const faceMeshRef = useRef<THREE.InstancedMesh>(null)
  const texture = useMemo(
    () => getRackTexture(colors.primary),
    [colors.primary],
  )

  const dummy = useMemo(() => new THREE.Object3D(), [])
  const color = useMemo(() => new THREE.Color(), [])

  useEffect(() => {
    if (!bodyMeshRef.current || !faceMeshRef.current) return

    data.forEach((item: any, i: number) => {
      dummy.position.set(item.x / 10, RACK_H / 2, item.y / 10)
      dummy.rotation.set(0, 0, 0)
      dummy.scale.set(1, 1, 1)
      dummy.updateMatrix()
      bodyMeshRef.current!.setMatrixAt(i, dummy.matrix)
      color.set(colors.rackBody)
      bodyMeshRef.current!.setColorAt(i, color)

      // Face
      dummy.position.set(
        item.x / 10,
        RACK_H / 2,
        item.y / 10 + RACK_D / 2 + 0.05,
      )
      dummy.updateMatrix()
      faceMeshRef.current!.setMatrixAt(i, dummy.matrix)
      faceMeshRef.current!.setColorAt(i, new THREE.Color('#ffffff'))
    })

    bodyMeshRef.current.instanceMatrix.needsUpdate = true
    if (bodyMeshRef.current.instanceColor)
      bodyMeshRef.current.instanceColor.needsUpdate = true

    faceMeshRef.current.instanceMatrix.needsUpdate = true
    if (faceMeshRef.current.instanceColor)
      faceMeshRef.current.instanceColor.needsUpdate = true

    const box = new THREE.Box3()
    const tempVec = new THREE.Vector3()

    data.forEach((item: any) => {
      tempVec.set(item.x / 10, RACK_H / 2, item.y / 10)
      box.expandByPoint(tempVec)
    })

    const center = new THREE.Vector3()
    box.getCenter(center)
    const radius = box.getBoundingSphere(new THREE.Sphere()).radius

    const boundingSphere = new THREE.Sphere(center, radius)
    bodyMeshRef.current.geometry.boundingSphere = boundingSphere
    faceMeshRef.current.geometry.boundingSphere = boundingSphere
  }, [data, colors, dummy, color])

  return (
    <group>
      <instancedMesh
        ref={bodyMeshRef}
        args={[undefined, undefined, data.length]}
        onClick={(e) => {
          e.stopPropagation()
          const instanceId = e.instanceId
          if (instanceId !== undefined && data[instanceId])
            onSelect(data[instanceId].id)
        }}
        onPointerMissed={() => onSelect(null)}
        renderOrder={1}
      >
        {/* @ts-expect-error - r3f extension */}
        <roundedBoxGeometry args={[RACK_W, RACK_H, RACK_D, 4, RADIUS]} />
        <meshStandardMaterial color="#ffffff" roughness={0.4} metalness={0.8} />
      </instancedMesh>

      <instancedMesh
        ref={faceMeshRef}
        args={[undefined, undefined, data.length]}
        renderOrder={1}
      >
        <planeGeometry args={[RACK_W - 1, RACK_H - 1]} />
        <meshStandardMaterial
          map={texture}
          transparent={false}
          emissiveMap={texture}
          emissive="#ffffff"
          emissiveIntensity={1}
        />
      </instancedMesh>
    </group>
  )
}

function RackLabels({ data, colors }: { data: Array<Equipment>; colors: any }) {
  const polesMeshRef = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const boxWidth = 12
  const boxHeight = 4
  const boxRadius = 1
  const riseHeight = 8

  const outerGeom = useMemo(
    () =>
      new RoundedBoxGeometry(
        boxWidth + 0.3,
        boxHeight + 0.3,
        0.05,
        8,
        boxRadius,
      ),
    [boxWidth, boxHeight, boxRadius],
  )
  const innerGeom = useMemo(
    () => new RoundedBoxGeometry(boxWidth, boxHeight, 0.1, 8, boxRadius),
    [boxWidth, boxHeight, boxRadius],
  )

  useEffect(() => {
    if (!polesMeshRef.current) return

    data.forEach((item, i) => {
      const x = item.x / 10
      const z = item.y / 10
      const y = RACK_H + riseHeight / 2

      dummy.position.set(x, y, z)
      dummy.rotation.set(0, 0, 0)
      dummy.scale.set(1, 1, 1)
      dummy.updateMatrix()
      polesMeshRef.current!.setMatrixAt(i, dummy.matrix)
    })

    polesMeshRef.current.instanceMatrix.needsUpdate = true
  }, [data, riseHeight, dummy])

  return (
    <group>
      {/* INSTANCED POLES */}
      <instancedMesh
        ref={polesMeshRef}
        args={[undefined, undefined, data.length]}
      >
        <cylinderGeometry args={[0.1, 0.1, riseHeight, 8]} />
        <meshStandardMaterial color={colors.primary} />
      </instancedMesh>

      {/* LABELS */}
      {data.map((item) => (
        <group key={item.id} position={[item.x / 10, RACK_H, item.y / 10]}>
          <Billboard
            position={[0, riseHeight, 0]}
            follow={true}
            lockX={false}
            lockY={false}
            lockZ={false}
          >
            {/* Border Background (Outer) */}
            <mesh position={[0, 0, -0.02]} geometry={outerGeom}>
              <meshStandardMaterial color={colors.primary} />
            </mesh>

            {/* Main Background (Inner) */}
            <mesh geometry={innerGeom}>
              <meshStandardMaterial color={colors.card} />
            </mesh>

            {/* Text */}
            <Text
              position={[0, 0, 0.06]}
              fontSize={2}
              fontWeight={800}
              color={colors.text}
              anchorX="center"
              anchorY="middle"
            >
              {item.id}
            </Text>
          </Billboard>
        </group>
      ))}
    </group>
  )
}

function WallInstances({
  walls,
  color,
}: {
  walls: Array<Wall>
  color: string
}) {
  return (
    <group>
      {walls.map((w) => {
        const x1 = w.x1 / 10
        const y1 = w.y1 / 10
        const x2 = w.x2 / 10
        const y2 = w.y2 / 10
        const len = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
        const ang = Math.atan2(y2 - y1, x2 - x1)
        const cx = (x1 + x2) / 2
        const cy = (y1 + y2) / 2
        return (
          <group key={w.id} position={[cx, 10, cy]} rotation={[0, -ang, 0]}>
            <mesh position={[0, 0, 0]} renderOrder={1}>
              <boxGeometry args={[len, 20, 1]} />
              <meshStandardMaterial
                color={color}
                roughness={0.9}
                transparent
                opacity={0.6}
              />
            </mesh>
            <mesh position={[0, 10.1, 0]} renderOrder={1}>
              <boxGeometry args={[len, 0.5, 1.2]} />
              <meshStandardMaterial color="#000" />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

export function CanvasComponent3D({ equipment, walls }: Canvas3DProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [is2D, setIs2D] = useState(false)
  const colors = useThemeColors()

  const selectedItem = useMemo(
    () => equipment.find((e) => e.id === selectedId),
    [selectedId, equipment],
  )

  const sceneCenter = useMemo(() => {
    if (equipment.length === 0) return new THREE.Vector3(0, 0, 0)
    let minX = Infinity,
      maxX = -Infinity,
      minZ = Infinity,
      maxZ = -Infinity
    equipment.forEach((e) => {
      const x = e.x / 10
      const z = e.y / 10
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (z < minZ) minZ = z
      if (z > maxZ) maxZ = z
    })
    return new THREE.Vector3((minX + maxX) / 2, 0, (minZ + maxZ) / 2)
  }, [equipment])

  const keyMap = useMemo(
    () => [
      { name: 'forward', keys: ['ArrowUp', 'KeyW'] },
      { name: 'back', keys: ['ArrowDown', 'KeyS'] },
      { name: 'left', keys: ['ArrowLeft', 'KeyA'] },
      { name: 'right', keys: ['ArrowRight', 'KeyD'] },
      { name: 'rotateLeft', keys: ['KeyQ'] },
      { name: 'rotateRight', keys: ['KeyE'] },
    ],
    [],
  )

  return (
    <div className="relative w-full h-full bg-background flex min-w-0 overflow-hidden">
      <div className="flex-1 relative h-full outline-none min-w-0">
        <div className="absolute top-4 right-4 z-10">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIs2D(!is2D)}
            className="shadow-md border border-border"
          >
            {is2D ? (
              <BoxIcon className="w-4 h-4 mr-2" />
            ) : (
              <MapIcon className="w-4 h-4 mr-2" />
            )}
            {is2D ? '3D' : '2D'}
          </Button>
        </div>

        <KeyboardControls map={keyMap}>
          <Canvas
            frameloop="demand"
            shadows
            dpr={[1, 1.5]}
            gl={{ antialias: true, logarithmicDepthBuffer: true }}
          >
            <Stats className="absolute! bottom-0! left-0! top-auto! z-0! opacity-0 pointer-events-none" />

            <PerspectiveCamera makeDefault={!is2D} fov={45} />
            <OrthographicCamera
              makeDefault={is2D}
              zoom={5}
              near={-500}
              far={2000}
            />

            <SceneController is2D={is2D} center={sceneCenter} />

            <ambientLight intensity={0.7} />
            <directionalLight
              position={[50, 100, 50]}
              intensity={1.5}
              castShadow
            />
            <Environment preset="city" />

            <Grid
              position={[0, -0.02, 0]}
              args={[2000, 2000]}
              cellSize={10}
              sectionSize={100}
              cellColor={colors.primary}
              sectionColor={colors.primary}
              fadeDistance={is2D ? 10000 : 800}
              infiniteGrid
              renderOrder={-1}
              cellThickness={0.75}
              sectionThickness={1.25}
            />

            <InstancedRacks
              data={equipment}
              onSelect={setSelectedId}
              colors={colors}
            />

            <RackLabels data={equipment} colors={colors} />

            <WallInstances walls={walls} color={colors.card} />

            {selectedItem && (
              <SelectionCursor
                x={selectedItem.x}
                y={selectedItem.y}
                color={colors.primary}
              />
            )}

            {!is2D && (
              <ContactShadows
                opacity={0.6}
                scale={200}
                blur={2.5}
                far={5}
                resolution={512}
                color="#000000"
              />
            )}
          </Canvas>
        </KeyboardControls>

        <ControlsOverlay is2D={is2D} />
      </div>

      {selectedItem && (
        <RackInfoPanel
          rack={selectedItem}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  )
}
