import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import {
  BakeShadows,
  Billboard,
  ContactShadows,
  Environment,
  GizmoHelper,
  GizmoViewport,
  Grid,
  KeyboardControls,
  Loader,
  MapControls,
  OrthographicCamera,
  PerspectiveCamera,
  RoundedBox,
  Text,
  TransformControls,
  Instances,
  Instance,
  useKeyboardControls,
} from '@react-three/drei'
import * as THREE from 'three'
import { formatHex } from 'culori'
import { useNavigate } from '@tanstack/react-router'
import { useShallow } from 'zustand/react/shallow'
import { RackInfoPanel } from './rack-info-panel'
import { ControlsOverlay } from './controls-overlay'
import { MapToolbar } from './map-toolbar'
import { ViewSettings } from './view-settings'
import type { Wall } from '@/types/types'
import { useLabStore } from '@/lib/store'

const RACK_SIZE = { w: 8, h: 20, d: 8 }
const WALL_H = 22
const WALL_T = 1.5

const wallGeometryBase = new THREE.BoxGeometry(1, WALL_H, WALL_T)
const glassGeometryBase = new THREE.PlaneGeometry(RACK_SIZE.w - 1, RACK_SIZE.h - 1)
const glassMaterialBase = new THREE.MeshStandardMaterial({
  color: '#FFF',
  metalness: 0.7,
  roughness: 0.7,
  transparent: true,
  opacity: 0.6,
  depthWrite: false,
})
const glowGeometryBase = new THREE.BoxGeometry(RACK_SIZE.w, RACK_SIZE.h, RACK_SIZE.d)
const rackGeometryBase = new THREE.BoxGeometry(RACK_SIZE.w, RACK_SIZE.h, RACK_SIZE.d)

type EditMode = 'view' | 'add-rack' | 'add-wall' | 'add-label' | 'move' | 'delete'

interface LabLabel {
  id: string
  text: string
  x: number
  y: number
}

const snapToData = (v3d: number, enabled: boolean) =>
  enabled ? Math.round(v3d) * 10 : v3d * 10

function GhostPreview({ mode, wallStart }: { mode: EditMode; wallStart: THREE.Vector3 | null }) {
  const meshRef = useRef<THREE.Group>(null)
  const wallMeshRef = useRef<THREE.Mesh>(null)
  const { mouse, camera } = useThree()
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), [])
  const raycaster = useMemo(() => new THREE.Raycaster(), [])
  const point = useMemo(() => new THREE.Vector3(), [])

  useFrame(() => {
    if (!meshRef.current || (mode !== 'add-rack' && mode !== 'add-wall')) return

    raycaster.setFromCamera(mouse, camera)
    raycaster.ray.intersectPlane(plane, point)

    const snappedX = Math.round(point.x)
    const snappedZ = Math.round(point.z)

    meshRef.current.position.set(snappedX, 0, snappedZ)

    if (mode === 'add-wall' && wallStart && wallMeshRef.current) {
      const dist = wallStart.distanceTo(new THREE.Vector3(snappedX, 0, snappedZ))
      const angle = Math.atan2(snappedZ - wallStart.z, snappedX - wallStart.x)

      wallMeshRef.current.scale.set(dist || 0.1, 1, 1)
      meshRef.current.position.set(
        (wallStart.x + snappedX) / 2,
        WALL_H / 2,
        (wallStart.z + snappedZ) / 2,
      )
      meshRef.current.rotation.y = -angle
    } else {
      meshRef.current.rotation.y = 0
    }
  })

  return (
    <group ref={meshRef}>
      {mode === 'add-rack' && (
        <mesh position={[0, RACK_SIZE.h / 2, 0]}>
          <boxGeometry args={[RACK_SIZE.w, RACK_SIZE.h, RACK_SIZE.d]} />
          <meshStandardMaterial color="#3b82f6" transparent opacity={0.3} />
        </mesh>
      )}
      {mode === 'add-wall' && wallStart && (
        <mesh ref={wallMeshRef} geometry={wallGeometryBase}>
          <meshStandardMaterial color="#3b82f6" transparent opacity={0.3} />
        </mesh>
      )}
    </group>
  )
}

function SceneController({ is2D, activeCamera, center, enabled }: { is2D: boolean; activeCamera: string; center?: THREE.Vector3; enabled: boolean }) {
  const { camera, invalidate } = useThree()
  const controlsRef = useRef<any>(null)
  const [, getKeys] = useKeyboardControls()
  const targetPos = useRef(new THREE.Vector3())
  const isTransitioning = useRef(false)

  useEffect(() => {
    if (!controlsRef.current || !center) return

    if (is2D) {
      targetPos.current.set(center.x, 600, center.z)
    } else {
      targetPos.current.set(center.x + 150, 200, center.z + 150)
    }

    isTransitioning.current = true
    if (controlsRef.current) controlsRef.current.target.copy(center)
    invalidate()
  }, [is2D, camera, invalidate, center])

  useFrame((_, delta) => {
    if (!enabled) return

    if (isTransitioning.current) {
      camera.position.lerp(targetPos.current, 5 * delta)
      if (camera.position.distanceTo(targetPos.current) < 1) {
        isTransitioning.current = false
      }
      controlsRef.current?.update()
      invalidate()
    }

    const { forward, back, left, right } = getKeys()
    if (isTransitioning.current) return

    const speed = 400 * delta
    const move = new THREE.Vector3()
    if (forward) move.z -= speed
    if (back) move.z += speed
    if (left) move.x -= speed
    if (right) move.x += speed

    if (move.lengthSq() > 0) {
      camera.position.add(move)
      controlsRef.current.target.add(move)
      invalidate()
    }
  })

  return (
    <MapControls
      ref={controlsRef}
      makeDefault
      enabled={enabled}
      screenSpacePanning={activeCamera === 'orthographic'}
      enableRotate={!is2D}
      maxPolarAngle={is2D ? 0 : Math.PI / 2.1}
    />
  )
}

function resolveColor(varName: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback
  const style = getComputedStyle(document.documentElement)
  const color = style.getPropertyValue(varName).trim()
  if (!color) return fallback
  const hex = formatHex(color)
  return hex || fallback
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
      setColors({
        background: resolveColor('--background', '#000000'),
        primary: resolveColor('--primary', '#3b82f6'),
        border: resolveColor('--border', '#333333'),
        card: resolveColor('--card', '#1a1a1a'),
        wall: resolveColor('--muted-foreground', '#666666'),
        rackBody: '#1e293b',
        grid: resolveColor('--border', '#333333'),
        text: resolveColor('--foreground', '#ffffff'),
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

export function CanvasComponent3D({ equipment: initialEquipment, walls: initialWalls, initialSelectedId }: any) {
  const initEquipment = useLabStore((state) => state.initEquipment)
  const getEquipmentArray = useLabStore((state) => state.getEquipmentArray)
  const addEquipment = useLabStore((state) => state.addEquipment)
  const updateEquipment = useLabStore((state) => state.updateEquipment)

  const equipmentIds = useLabStore(useShallow((state) => Object.keys(state.equipment)))

  const initStore = useRef(false)
  useEffect(() => {
    if (!initStore.current) {
      initEquipment(initialEquipment)
      initStore.current = true
    }
  }, [initialEquipment, initEquipment])

  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId || null)
  const [transformTarget, setTransformTarget] = useState<THREE.Object3D | null>(null)
  const [is2D, setIs2D] = useState(false)
  const [projection, setProjection] = useState<'perspective' | 'orthographic'>('perspective')
  
  const colors = useThemeColors()
  const navigate = useNavigate()

  const [walls, setWalls] = useState<Array<Wall>>(initialWalls)
  const [labels, setLabels] = useState<Array<LabLabel>>([])

  const [history, setHistory] = useState<Array<string>>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [mode, setMode] = useState<EditMode>('view')
  const [useSnap, setUseSnap] = useState(true)
  const [viewOverlay, setViewOverlay] = useState<'none' | 'heatmap' | 'network'>('none')
  const [wallStart, setWallStart] = useState<THREE.Vector3 | null>(null)

  const activeCamera = is2D ? 'orthographic' : projection

  useEffect(() => {
    if (mode !== 'move') setTransformTarget(null)
  }, [mode])

  const handleSelect = (id: string | null) => {
    setSelectedId(id)
    navigate({
      to: '/map',
      search: (prev: any) => ({
        ...prev,
        redirectId: id ?? undefined,
        redirectType: 'rack',
      }),
      replace: true,
    })
  }

  const saveToHistory = useCallback(() => {
    const state = JSON.stringify({ equipment: getEquipmentArray(), walls, labels })
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1)
      newHistory.push(state)
      return newHistory.slice(-25)
    })
    setHistoryIndex((prev) => Math.min(prev + 1, 24))
  }, [getEquipmentArray, walls, labels, historyIndex])

  const handleGridClick = (e: any) => {
    if (mode === 'view' || mode === 'move') return
    e.stopPropagation()
    const pt = new THREE.Vector3(Math.round(e.point.x), 0, Math.round(e.point.z))
    saveToHistory()

    if (mode === 'add-rack') {
      addEquipment({
        id: `RACK-${Date.now()}`,
        x: pt.x * 10,
        y: pt.z * 10,
        rotation: 0,
        type: 'rack',
        label: 'New',
      } as any)
      setMode('view')
    } else if (mode === 'add-wall') {
      if (!wallStart) setWallStart(pt)
      else {
        setWalls([
          ...walls,
          {
            id: `WALL-${Date.now()}`,
            x1: wallStart.x * 10,
            y1: wallStart.z * 10,
            x2: pt.x * 10,
            y2: pt.z * 10,
          },
        ])
        setWallStart(null)
        setMode('view')
      }
    } else if (mode === 'add-label') {
      const text = prompt('Label Text:', 'Zone A')
      if (text)
        setLabels([...labels, { id: `L-${Date.now()}`, text, x: pt.x, y: pt.z }])
      setMode('view')
    }
  }

  const sceneCenter = useMemo(() => {
    const eqArray = getEquipmentArray()
    if (!eqArray.length) return new THREE.Vector3(0, 0, 0)
    const avgX = eqArray.reduce((acc, e) => acc + e.x, 0) / eqArray.length
    const avgY = eqArray.reduce((acc, e) => acc + e.y, 0) / eqArray.length
    return new THREE.Vector3(avgX / 10, 0, avgY / 10)
  }, [equipmentIds.length, getEquipmentArray])

  return (
    <div
      className="relative w-full h-full bg-background flex min-w-0 overflow-hidden outline-none"
      tabIndex={0}
      onMouseDown={(e) => e.currentTarget.focus()}
    >
      <div className="flex-1 relative h-full min-w-0">
        <div className="absolute top-4 left-4 z-20 flex flex-col gap-4">
          <ViewSettings
            canUndo={historyIndex > 0}
            canRedo={historyIndex < history.length - 1}
            onUndo={() => {
              if (historyIndex > 0) {
                const prev = JSON.parse(history[historyIndex - 1])
                initEquipment(prev.equipment)
                setWalls(prev.walls)
                setLabels(prev.labels)
                setHistoryIndex(historyIndex - 1)
              }
            }}
            onRedo={() => {
              if (historyIndex < history.length - 1) {
                const next = JSON.parse(history[historyIndex + 1])
                initEquipment(next.equipment)
                setWalls(next.walls)
                setLabels(next.labels)
                setHistoryIndex(historyIndex + 1)
              }
            }}
            viewOverlay={viewOverlay}
            setViewOverlay={setViewOverlay}
            useSnap={useSnap}
            setUseSnap={setUseSnap}
            is2D={is2D}
            setIs2D={setIs2D}
            projection={projection}
            setProjection={setProjection}
          />

          <MapToolbar mode={mode} setMode={setMode} />
        </div>

        <KeyboardControls
          map={[
            { name: 'forward', keys: ['ArrowUp', 'KeyW'] },
            { name: 'back', keys: ['ArrowDown', 'KeyS'] },
            { name: 'left', keys: ['ArrowLeft', 'KeyA'] },
            { name: 'right', keys: ['ArrowRight', 'KeyD'] },
          ]}
        >
          <Canvas shadows dpr={[1, 2]} gl={{ antialias: true, logarithmicDepthBuffer: true }} camera={{ far: 2000 }}>
            <Suspense fallback={null}>
              <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
                <GizmoViewport />
              </GizmoHelper>

              <PerspectiveCamera makeDefault={activeCamera === 'perspective'} fov={45} />
              <OrthographicCamera makeDefault={activeCamera === 'orthographic'} zoom={is2D ? 15 : 6} near={-500} far={2000} />
              <SceneController
                is2D={is2D}
                activeCamera={activeCamera}
                center={mode === 'view' ? sceneCenter : undefined}
                enabled={mode === 'view'}
              />

              <ambientLight intensity={1.8} />
              <pointLight
                position={[100, 200, 100]}
                castShadow
                intensity={3}
                shadow-bias={-0.0005}
                shadow-mapSize={1024}
              />
              <Environment preset="warehouse" />

              <mesh rotation={[-Math.PI / 2, 0, 0]} onClick={handleGridClick} position={[0, -0.05, 0]}>
                <planeGeometry args={[10000, 10000]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
              </mesh>

              <Grid
                infiniteGrid
                cellSize={10}
                sectionSize={50}
                cellColor={colors.grid}
                sectionColor={colors.primary}
                fadeDistance={1500}
                fadeStrength={1}
                cellThickness={1}
                sectionThickness={2}
                position={[0, -0.01, 0]}
              />

              {transformTarget && mode === 'move' && (
                <TransformControls
                  object={transformTarget}
                  mode="translate"
                  showY={false}
                  translationSnap={useSnap ? 1 : null}
                  onMouseUp={() => {
                    if (!transformTarget) return
                    const id = transformTarget.userData.id
                    saveToHistory()
                    updateEquipment(id, {
                      x: snapToData(transformTarget.position.x, useSnap),
                      y: snapToData(transformTarget.position.z, useSnap),
                    })
                  }}
                />
              )}

              {/* Instanced Racks Container */}
              <Instances limit={5000} geometry={rackGeometryBase} castShadow receiveShadow>
                {viewOverlay === 'none' ? (
                  <meshStandardMaterial metalness={0.9} roughness={0.5} color="#ffffff" />
                ) : (
                  <meshBasicMaterial color="#ffffff" />
                )}
                
                {equipmentIds.map((id) => (
                  <Rack
                    key={id}
                    id={id}
                    colors={colors}
                    mode={mode}
                    viewOverlay={viewOverlay}
                    isSelected={selectedId === id}
                    transformTarget={transformTarget}
                    setTransformTarget={setTransformTarget}
                    onSelect={handleSelect}
                    saveToHistory={saveToHistory}
                  />
                ))}
              </Instances>

              {walls.map((w: Wall) => (
                <WallInstance
                  key={w.id}
                  data={w}
                  colors={colors}
                  mode={mode}
                  onDelete={() => {
                    saveToHistory()
                    setWalls((prev) => prev.filter((item) => item.id !== w.id))
                  }}
                />
              ))}

              {labels.map((l) => (
                <Billboard
                  key={l.id}
                  position={[l.x, 8, l.y]}
                  onClick={() => {
                    const res = prompt("Edit label or type 'DELETE'", l.text)
                    if (res === 'DELETE') {
                      saveToHistory()
                      setLabels((prev) => prev.filter((p) => p.id !== l.id))
                    } else if (res) {
                      saveToHistory()
                      setLabels((prev) => prev.map((p) => (p.id === l.id ? { ...p, text: res } : p)))
                    }
                  }}
                >
                  <Text fontSize={5} color={colors.text} fontWeight="bold" fillOpacity={0.7}>
                    {l.text}
                  </Text>
                </Billboard>
              ))}

              <GhostPreview mode={mode} wallStart={wallStart} />

              <ContactShadows opacity={0.4} scale={1000} blur={2.5} far={15} resolution={256} color="#000000" />
            </Suspense>
          </Canvas>
        </KeyboardControls>
        <ControlsOverlay is2D={is2D} />
        <Loader
          containerStyles={{ background: 'var(--background)' }}
          innerStyles={{ backgroundColor: 'var(--card)' }}
          barStyles={{ backgroundColor: 'var(--primary)' }}
          dataInterpolation={(p) => `Loading lab map... ${p.toFixed(0)}%`}
        />
      </div>

      {selectedId && getEquipmentArray().find((e) => e.id === selectedId) && (
        <RackInfoPanel rack={getEquipmentArray().find((e) => e.id === selectedId)!} onClose={() => setSelectedId(null)} />
      )}
    </div>
  )
}

function Rack({ id, colors, mode, onSelect, viewOverlay, isSelected, transformTarget, setTransformTarget, saveToHistory }: any) {
  const data = useLabStore((state) => state.equipment[id])
  const updateEquipment = useLabStore((state) => state.updateEquipment)
  const deleteEquipment = useLabStore((state) => state.deleteEquipment)

  const groupRef = useRef<THREE.Group>(null)
  const textGroupRef = useRef<THREE.Group>(null)

  const isMove = mode === 'move'
  const isDel = mode === 'delete'
  const isTarget = transformTarget && transformTarget.userData.id === id

  const rackRotation = (data as any).rotation || 0

  useFrame((state) => {
    if (textGroupRef.current && groupRef.current) {
      if (state.camera.type === 'OrthographicCamera') {
        textGroupRef.current.visible = state.camera.zoom > 4
      } else {
        const dist = state.camera.position.distanceTo(groupRef.current.position)
        textGroupRef.current.visible = dist < 800
      }
    }
  })

  const rackColor = useMemo(() => {
    if (!data) return colors.rackBody
    const match = data.id.match(/R(\d+)-C(\d+)/)
    const r = match ? parseInt(match[1], 10) : 0
    const c = match ? parseInt(match[2], 10) : 0

    if (viewOverlay === 'heatmap') {
      const lightness = r % 2 === 0 ? 40 : 70
      return `hsl(10, 100%, ${lightness}%)`
    }

    if (viewOverlay === 'network') {
      const lightness = c % 2 === 0 ? 40 : 70
      return `hsl(210, 100%, ${lightness}%)`
    }

    return colors.rackBody
  }, [viewOverlay, data?.id, colors.rackBody])

  const handleClick = useCallback(
    (e: any) => {
      e.stopPropagation()
      if (isMove) {
        if (e.shiftKey) {
          saveToHistory()
          updateEquipment(id, { rotation: (rackRotation + Math.PI / 2) % (Math.PI * 2) } as any)
        } else if (groupRef.current) {
          setTransformTarget(groupRef.current)
        }
      } else if (isDel) {
        saveToHistory()
        deleteEquipment(id)
      } else {
        onSelect(id)
      }
    },
    [isMove, isDel, rackRotation, id, updateEquipment, deleteEquipment, onSelect, setTransformTarget, saveToHistory],
  )

  if (!data) return null

  return (
    <group
      ref={groupRef}
      userData={{ id: data.id }}
      position={[data.x / 10, RACK_SIZE.h / 2, data.y / 10]}
      rotation={[0, rackRotation, 0]}
    >
      {isSelected && (
        <mesh scale={[1.05, 1.01, 1.05]} geometry={glowGeometryBase}>
          <meshBasicMaterial color={colors.primary} transparent opacity={0.3} />
        </mesh>
      )}

      {isSelected || isTarget ? (
        <RoundedBox args={[RACK_SIZE.w, RACK_SIZE.h, RACK_SIZE.d]} radius={0.2} castShadow onClick={handleClick}>
          <meshStandardMaterial
            color={isDel ? '#ef4444' : rackColor}
            metalness={0.9}
            roughness={0.5}
            emissive={viewOverlay !== 'none' ? rackColor : '#000'}
            emissiveIntensity={viewOverlay !== 'none' ? 0.6 : 0}
          />
        </RoundedBox>
      ) : (
        <Instance color={isDel ? '#ef4444' : rackColor} onClick={handleClick} />
      )}

      <mesh position={[0, 0, RACK_SIZE.d / 2 + 0.1]} geometry={glassGeometryBase} material={glassMaterialBase} />

      <group ref={textGroupRef}>
        <Billboard position={[0, RACK_SIZE.h / 2 + 4, 0]}>
          <mesh>
            <planeGeometry args={[data.id.length * 1.2 + 2, 4]} />
            <meshBasicMaterial color="#000000" transparent opacity={0.6} depthTest={false} />
          </mesh>

          <Text fontSize={2} color={colors.text} fontWeight="bold" anchorX="center" anchorY="middle" renderOrder={100}>
            {data.id}
          </Text>
        </Billboard>
      </group>
    </group>
  )
}

function WallInstance({ data, colors, mode, onDelete }: any) {
  const x1 = data.x1 / 10
  const z1 = data.y1 / 10
  const x2 = data.x2 / 10
  const z2 = data.y2 / 10

  const { position, rotation, scale } = useMemo(() => {
    const len = Math.sqrt((x2 - x1) ** 2 + (z2 - z1) ** 2)
    const ang = Math.atan2(z2 - z1, x2 - x1)

    return {
      position: [(x1 + x2) / 2, WALL_H / 2, (z1 + z2) / 2],
      rotation: [0, -ang, 0],
      scale: [len, 1, 1],
    }
  }, [x1, z1, x2, z2])

  return (
    <group
      position={position as any}
      rotation={rotation as any}
      onClick={(e) => {
        e.stopPropagation()
        if (mode === 'delete') onDelete()
      }}
    >
      <mesh castShadow geometry={wallGeometryBase} scale={scale as any}>
        <meshStandardMaterial color={mode === 'delete' ? '#ef4444' : colors.wall} transparent opacity={0.7} />
      </mesh>
    </group>
  )
}
