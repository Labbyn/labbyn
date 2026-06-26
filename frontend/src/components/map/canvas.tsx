import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import {
  Billboard,
  ContactShadows,
  Environment,
  GizmoHelper,
  GizmoViewport,
  Grid,
  Instance,
  Instances,
  KeyboardControls,
  Loader,
  MapControls,
  OrthographicCamera,
  PerspectiveCamera,
  Text,
  TransformControls,
  useKeyboardControls,
} from '@react-three/drei'
import * as THREE from 'three'
import { formatHex } from 'culori'
import { useBlocker, useNavigate } from '@tanstack/react-router'
import { useShallow } from 'zustand/react/shallow'
import {
  AlertTriangle,
  MapPin,
  Palette,
  Redo2,
  Save,
  Search,
  Server,
  Trash2,
  Type,
  Undo2,
  X,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'

import { Badge } from '../ui/badge'
import { ScrollArea, ScrollBar } from '../ui/scroll-area'
import { RackInfoPanel } from './rack-info-panel'
import { ControlsOverlay } from './controls-overlay'
import { MapToolbar } from './map-toolbar'
import { ViewSettings } from './view-settings'
import type { ThreeEvent } from '@react-three/fiber'
import type {
  MapControls as MapControlsImpl,
  TransformControls as TransformControlsImpl,
} from 'three-stdlib'
import type { Equipment, WallNode, WallSegment } from '@/types/types'
import type { ApiRackDetailItem } from '@/integrations/racks/racks.types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useSyncRoomMap } from '@/integrations/map/map.mutation'
import { Button } from '@/components/ui/button'
import { useLabStore } from '@/lib/store'
import { racksBaseListQueryOptions } from '@/integrations/racks/racks.query'

const RACK_SIZE = { w: 8, h: 20, d: 8 }
const WALL_H = 22
const WALL_T = 1.5

const wallGeometryBase = new THREE.BoxGeometry(1, WALL_H, WALL_T)
const glassGeometryBase = new THREE.PlaneGeometry(
  RACK_SIZE.w - 1,
  RACK_SIZE.h - 1,
)
const glassMaterialBase = new THREE.MeshPhysicalMaterial({
  color: '#020202',
  metalness: 0.9,
  roughness: 0.1,
  clearcoat: 1.0,
  clearcoatRoughness: 0.1,
  transparent: true,
  opacity: 0.35,
  depthWrite: false,
})

const generateServerTextures = () => {
  const w = 512
  const h = 1024

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  canvas.width = w
  canvas.height = h

  const emissive = document.createElement('canvas')
  const ctxE = emissive.getContext('2d')!
  emissive.width = w
  emissive.height = h

  ctx.fillStyle = '#050505'
  ctx.fillRect(0, 0, w, h)
  ctxE.fillStyle = '#000000'
  ctxE.fillRect(0, 0, w, h)

  const slots = 22
  const uHeight = h / slots

  for (let i = 0; i < slots; i++) {
    const y = i * uHeight

    ctx.fillStyle = '#000000'
    ctx.fillRect(0, y, w, 4)

    const rand = Math.random()
    if (rand < 0.15) continue

    const chassisColor = Math.random() > 0.5 ? '#111111' : '#1c1c1c'
    ctx.fillStyle = chassisColor
    ctx.fillRect(8, y + 4, w - 16, uHeight - 4)

    ctx.fillStyle = '#333333'
    ctx.fillRect(8, y + 4, 20, uHeight - 4)
    ctx.fillRect(w - 28, y + 4, 20, uHeight - 4)

    if (rand < 0.5) {
      for (let d = 0; d < 12; d++) {
        const bayX = 40 + d * 34
        ctx.fillStyle = '#080808'
        ctx.fillRect(bayX, y + 10, 26, uHeight - 16)

        ctx.fillStyle = '#222222'
        ctx.fillRect(bayX + 2, y + 12, 22, 6)

        if (Math.random() > 0.2) {
          const isErr = Math.random() > 0.95
          const color = isErr ? '#ff1111' : '#00ff44'

          ctx.fillStyle = color
          ctx.fillRect(bayX + 16, y + Math.floor(uHeight / 2) + 4, 6, 6)
          ctxE.fillStyle = color
          ctxE.fillRect(bayX + 16, y + Math.floor(uHeight / 2) + 4, 6, 6)
        }
      }
    } else if (rand < 0.8) {
      ctx.fillStyle = '#030303'
      for (let v = 0; v < 6; v++) {
        ctx.fillRect(40, y + 12 + v * 5, 220, 3)
      }

      for (let d = 0; d < 4; d++) {
        const bayX = 280 + d * 34
        ctx.fillStyle = '#080808'
        ctx.fillRect(bayX, y + 10, 26, uHeight - 16)
        ctx.fillStyle = '#222222'
        ctx.fillRect(bayX + 2, y + 12, 22, 6)

        if (Math.random() > 0.1) {
          const color = '#00ff44'
          ctx.fillStyle = color
          ctx.fillRect(bayX + 16, y + Math.floor(uHeight / 2) + 4, 6, 6)
          ctxE.fillStyle = color
          ctxE.fillRect(bayX + 16, y + Math.floor(uHeight / 2) + 4, 6, 6)
        }
      }
    } else {
      ctx.fillStyle = '#080808'
      ctx.fillRect(40, y + 10, 360, uHeight - 16)

      for (let p = 0; p < 24; p++) {
        const portX = 46 + p * 14
        ctx.fillStyle = '#000000'
        ctx.fillRect(portX, y + 16, 10, 16)

        if (Math.random() > 0.3) {
          const color = Math.random() > 0.5 ? '#00ff44' : '#ffaa00'
          ctx.fillStyle = color
          ctx.fillRect(portX + 2, y + 34, 6, 3)
          ctxE.fillStyle = color
          ctxE.fillRect(portX + 2, y + 34, 6, 3)
        }
      }
    }

    const pwrX = w - 60

    ctx.fillStyle = '#3b82f6'
    ctx.fillRect(pwrX, y + 16, 12, 12)
    ctxE.fillStyle = '#3b82f6'
    ctxE.fillRect(pwrX, y + 16, 12, 12)

    const statColor = Math.random() > 0.9 ? '#ff1111' : '#00ff44'
    ctx.fillStyle = statColor
    ctx.fillRect(pwrX + 20, y + 18, 8, 8)
    ctxE.fillStyle = statColor
    ctxE.fillRect(pwrX + 20, y + 18, 8, 8)
  }

  return {
    map: new THREE.CanvasTexture(canvas),
    emissiveMap: new THREE.CanvasTexture(emissive),
  }
}

const textures = generateServerTextures()

const generateRackBumpMap = () => {
  const w = 256
  const h = 512
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  canvas.width = w
  canvas.height = h

  ctx.fillStyle = '#808080'
  ctx.fillRect(0, 0, w, h)

  ctx.fillStyle = '#000000'
  for (let y = 30; y < h - 30; y += 10) {
    for (let x = 30; x < w - 30; x += 10) {
      const offsetX = (y / 10) % 2 === 0 ? 0 : 5
      ctx.beginPath()
      ctx.arc(x + offsetX, y, 3, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 20
  ctx.strokeRect(10, 10, w - 20, h - 20)

  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(w / 2, 10)
  ctx.lineTo(w / 2, h - 10)
  ctx.stroke()

  const texture = new THREE.CanvasTexture(canvas)

  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping

  texture.repeat.set(1, 2)

  return texture
}

const generateWallBumpMap = () => {
  const w = 512
  const h = 512
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  canvas.width = w
  canvas.height = h

  ctx.fillStyle = '#808080'
  ctx.fillRect(0, 0, w, h)

  const imgData = ctx.getImageData(0, 0, w, h)
  const data = imgData.data
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 25
    const val = 128 + noise
    data[i] = val
    data[i + 1] = val
    data[i + 2] = val
    data[i + 3] = 255
  }
  ctx.putImageData(imgData, 0, 0)

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, w, 15)
  ctx.fillStyle = '#b0b0b0'
  ctx.fillRect(0, 15, w, 5)

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, h - 35, w, 35)
  ctx.fillStyle = '#a0a0a0'
  ctx.fillRect(0, h - 38, w, 3)

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping

  texture.repeat.set(4, 1)
  texture.needsUpdate = true

  return texture
}

const wallBumpTexture = generateWallBumpMap()

const rackBumpTexture = generateRackBumpMap()

const innerServerMaterialBase = new THREE.MeshStandardMaterial({
  map: textures.map,
  emissiveMap: textures.emissiveMap,
  emissive: '#ffffff',
  emissiveIntensity: 3.0,
  roughness: 0.6,
  metalness: 0.8,
})
const glowGeometryBase = new THREE.BoxGeometry(
  RACK_SIZE.w,
  RACK_SIZE.h,
  RACK_SIZE.d,
)
const rackGeometryBase = new THREE.BoxGeometry(
  RACK_SIZE.w,
  RACK_SIZE.h,
  RACK_SIZE.d,
)

export type EditMode =
  | 'view'
  | 'select'
  | 'add-rack'
  | 'add-wall'
  | 'add-label'
  | 'move'
  | 'rotate'
  | 'paint'
  | 'delete'

export interface LabLabel {
  id: string | number
  text?: string
  name?: string
  x: number
  y: number
  color?: string
}

const snapToData = (v3d: number, enabled: boolean) =>
  enabled ? Math.round(v3d) * 10 : v3d * 10

function useThemeColors() {
  const [colors, setColors] = useState({
    background: '#000000',
    primary: '#3b82f6',
    border: '#333333',
    card: '#222222',
    wall: '#555555',
    rackBody: '#131313',
    grid: '#333333',
    text: '#ffffff',
  })

  useEffect(() => {
    let timeout: NodeJS.Timeout
    const update = () => {
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        const style = getComputedStyle(document.documentElement)
        const getHex = (varName: string, fallback: string) => {
          const color = style.getPropertyValue(varName).trim()
          return color ? formatHex(color) || fallback : fallback
        }
        setColors({
          background: getHex('--background', '#000000'),
          primary: getHex('--primary', '#3b82f6'),
          border: getHex('--border', '#333333'),
          card: getHex('--card', '#1a1a1a'),
          wall: getHex('--muted-foreground', '#666666'),
          rackBody: '#222222',
          grid: getHex('--border', '#333333'),
          text: getHex('--foreground', '#ffffff'),
        })
      }, 100)
    }

    update()
    const observer = new MutationObserver(update)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })
    return () => {
      observer.disconnect()
      clearTimeout(timeout)
    }
  }, [])

  return colors
}

function useLabHistory(
  initEquipment: (eq: Array<Equipment>) => void,
  getEquipmentArray: () => Array<Equipment>,
  initWallNodes: (nodes: Array<WallNode>) => void,
  initWallSegments: (segments: Array<WallSegment>) => void,
  setLabels: React.Dispatch<React.SetStateAction<Array<LabLabel>>>,
) {
  interface HistoryState {
    equipment: Array<Equipment>
    wallNodes: Array<WallNode>
    wallSegments: Array<WallSegment>
    labels: Array<LabLabel>
  }

  const [history, setHistory] = useState<Array<HistoryState>>([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  const saveToHistory = useCallback(
    (
      currentNodes: Array<WallNode>,
      currentSegments: Array<WallSegment>,
      currentLabels: Array<LabLabel>,
    ) => {
      setHistory((prev) => {
        const newHistory = prev.slice(0, Math.max(0, historyIndex + 1))
        newHistory.push({
          equipment: [...getEquipmentArray()],
          wallNodes: [...currentNodes],
          wallSegments: [...currentSegments],
          labels: [...currentLabels],
        })
        return newHistory.slice(-25)
      })
      setHistoryIndex((prev) => Math.min(prev + 1, 24))
    },
    [getEquipmentArray, historyIndex],
  )

  const undo = useCallback(
    (
      currentNodes: Array<WallNode>,
      currentSegments: Array<WallSegment>,
      currentLabels: Array<LabLabel>,
    ) => {
      if (historyIndex >= 0) {
        let currentHistory = history
        if (historyIndex === history.length - 1 && history.length < 25) {
          currentHistory = [
            ...history,
            {
              equipment: getEquipmentArray(),
              wallNodes: currentNodes,
              wallSegments: currentSegments,
              labels: currentLabels,
            },
          ]
          setHistory(currentHistory)
        }
        const prev = currentHistory[historyIndex]
        initEquipment(prev.equipment)
        initWallNodes(prev.wallNodes)
        initWallSegments(prev.wallSegments)
        setLabels(prev.labels)
        setHistoryIndex(historyIndex - 1)
      }
    },
    [
      history,
      historyIndex,
      getEquipmentArray,
      initEquipment,
      initWallNodes,
      initWallSegments,
      setLabels,
    ],
  )

  const redo = useCallback(() => {
    const nextIdx = historyIndex + 1
    if (nextIdx < history.length - 1) {
      const next = history[nextIdx + 1]
      initEquipment(next.equipment)
      initWallNodes(next.wallNodes)
      initWallSegments(next.wallSegments)
      setLabels(next.labels)
      setHistoryIndex(nextIdx)
    }
  }, [
    history,
    historyIndex,
    initEquipment,
    initWallNodes,
    initWallSegments,
    setLabels,
  ])

  return { history, historyIndex, saveToHistory, undo, redo }
}

function useBoxSelection(
  mode: EditMode,
  wallNodes: Array<WallNode>,
  labels: Array<LabLabel>,
  setSelectedIds: React.Dispatch<React.SetStateAction<Array<string>>>,
) {
  const [selectStart, setSelectStart] = useState<THREE.Vector3 | null>(null)
  const [selectEnd, setSelectEnd] = useState<THREE.Vector3 | null>(null)

  const handlePointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (mode === 'select') {
        e.stopPropagation()
        setSelectStart(e.point.clone())
        setSelectEnd(e.point.clone())
      }
    },
    [mode],
  )

  const handlePointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (mode === 'select' && selectStart) {
        e.stopPropagation()
        setSelectEnd(e.point.clone())
      }
    },
    [mode, selectStart],
  )

  const handlePointerUp = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (mode === 'select' && selectStart && selectEnd) {
        e.stopPropagation()
        const minX = Math.min(selectStart.x, selectEnd.x)
        const maxX = Math.max(selectStart.x, selectEnd.x)
        const minZ = Math.min(selectStart.z, selectEnd.z)
        const maxZ = Math.max(selectStart.z, selectEnd.z)

        const eqArray = useLabStore.getState().getEquipmentArray()
        const selectedRacks = eqArray
          .filter((eq) => {
            const ex = eq.x / 10
            const ez = eq.y / 10
            return ex >= minX && ex <= maxX && ez >= minZ && ez <= maxZ
          })
          .map((eq) => eq.id)

        const selectedNodes = wallNodes
          .filter((n) => {
            const cx = n.x / 10
            const cz = n.y / 10
            return cx >= minX && cx <= maxX && cz >= minZ && cz <= maxZ
          })
          .map((n) => n.id)

        const selectedLabels = labels
          .filter((l) => {
            return l.x >= minX && l.x <= maxX && l.y >= minZ && l.y <= maxZ
          })
          .map((l) => String(l.id))

        setSelectedIds((prev) => {
          if (e.shiftKey)
            return Array.from(
              new Set([
                ...prev,
                ...selectedRacks,
                ...selectedNodes,
                ...selectedLabels,
              ]),
            )
          return [...selectedRacks, ...selectedNodes, ...selectedLabels]
        })
        setSelectStart(null)
        setSelectEnd(null)
      }
    },
    [mode, selectStart, selectEnd, wallNodes, labels, setSelectedIds],
  )

  return {
    selectStart,
    selectEnd,
    setSelectStart,
    setSelectEnd,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  }
}

function GhostPreview({
  mode,
  wallStart,
  wallNodes,
  useSnap,
}: {
  mode: EditMode
  wallStart: THREE.Vector3 | null
  wallNodes: Array<WallNode>
  useSnap: boolean
}) {
  const cursorRef = useRef<THREE.Group>(null)
  const wallMeshRef = useRef<THREE.Mesh>(null)
  const { mouse, camera } = useThree()
  const plane = useMemo(
    () => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
    [],
  )
  const raycaster = useMemo(() => new THREE.Raycaster(), [])
  const point = useMemo(() => new THREE.Vector3(), [])

  useFrame(() => {
    raycaster.setFromCamera(mouse, camera)
    raycaster.ray.intersectPlane(plane, point)

    let snappedX = useSnap ? Math.round(point.x) : point.x
    let snappedZ = useSnap ? Math.round(point.z) : point.z

    if (mode === 'add-wall') {
      for (const n of wallNodes) {
        if (Math.hypot(n.x / 10 - point.x, n.y / 10 - point.z) < 3) {
          snappedX = n.x / 10
          snappedZ = n.y / 10
          break
        }
      }
    }

    if (cursorRef.current) cursorRef.current.position.set(snappedX, 0, snappedZ)

    if (mode === 'add-wall' && wallStart && wallMeshRef.current) {
      const dist = wallStart.distanceTo(
        new THREE.Vector3(snappedX, 0, snappedZ),
      )
      const angle = Math.atan2(snappedZ - wallStart.z, snappedX - wallStart.x)

      wallMeshRef.current.scale.set(dist || 0.1, 1, 1)
      wallMeshRef.current.position.set(
        (wallStart.x + snappedX) / 2,
        WALL_H / 2,
        (wallStart.z + snappedZ) / 2,
      )
      wallMeshRef.current.rotation.y = -angle
    }
  })

  return (
    <group>
      <group ref={cursorRef}>
        {mode === 'add-rack' && (
          <mesh position={[0, RACK_SIZE.h / 2, 0]}>
            <boxGeometry args={[RACK_SIZE.w, RACK_SIZE.h, RACK_SIZE.d]} />
            <meshStandardMaterial color="#3b82f6" transparent opacity={0.3} />
          </mesh>
        )}
      </group>

      {mode === 'add-wall' && wallStart && (
        <mesh ref={wallMeshRef} geometry={wallGeometryBase}>
          <meshStandardMaterial color="#3b82f6" transparent opacity={0.3} />
        </mesh>
      )}
    </group>
  )
}

function SceneController({
  is2D,
  activeCamera,
  center,
  enabled,
  controlsRef,
  focusTarget,
}: {
  is2D: boolean
  activeCamera: string
  center?: THREE.Vector3
  enabled: boolean
  controlsRef: React.RefObject<MapControlsImpl | null>
  focusTarget?: THREE.Vector3 | null
}) {
  const { camera, invalidate } = useThree()
  const [, getKeys] = useKeyboardControls()
  const initialized = useRef(false)
  const prevIs2D = useRef(is2D)
  const isTypingRef = useRef(false)

  const [lerpState, setLerpState] = useState<{
    target: THREE.Vector3
    camPos: THREE.Vector3
  } | null>(null)

  useEffect(() => {
    if (!controlsRef.current || !center) return

    if (!initialized.current) {
      if (is2D) camera.position.set(center.x, 600, center.z)
      else camera.position.set(center.x + 150, 200, center.z + 150)
      controlsRef.current.target.copy(center)
      camera.lookAt(center)
      controlsRef.current.update()
      initialized.current = true
      return
    }

    if (prevIs2D.current !== is2D && !lerpState) {
      const target = controlsRef.current.target
      if (is2D) camera.position.set(target.x, 600, target.z)
      else camera.position.set(target.x + 150, 200, target.z + 150)
      controlsRef.current.update()
      prevIs2D.current = is2D
      invalidate()
    }
  }, [is2D, camera, invalidate, center, controlsRef, lerpState])

  useEffect(() => {
    if (focusTarget && controlsRef.current && initialized.current) {
      const currentOffset = new THREE.Vector3()
        .copy(camera.position)
        .sub(controlsRef.current.target)
      setLerpState({
        target: focusTarget.clone(),
        camPos: focusTarget.clone().add(currentOffset),
      })
    }
  }, [focusTarget])

  // 3. Pozostałe efekty
  useEffect(() => {
    const controls = controlsRef.current
    if (!controls) return
    const cancelLerp = () => setLerpState(null)
    controls.addEventListener('start', cancelLerp)
    return () => controls.removeEventListener('start', cancelLerp)
  }, [controlsRef.current])

  useEffect(() => {
    const checkIsInput = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false
      return (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      )
    }

    const handleFocusIn = (e: FocusEvent) => {
      if (checkIsInput(e.target)) isTypingRef.current = true
    }

    const handleFocusOut = (e: FocusEvent) => {
      if (checkIsInput(e.target)) isTypingRef.current = false
    }

    document.addEventListener('focusin', handleFocusIn, true)
    document.addEventListener('focusout', handleFocusOut, true)

    return () => {
      document.removeEventListener('focusin', handleFocusIn, true)
      document.removeEventListener('focusout', handleFocusOut, true)
    }
  }, [])

  const direction = useMemo(() => new THREE.Vector3(), [])
  const rightVec = useMemo(() => new THREE.Vector3(), [])

  useFrame((_, delta) => {
    if (lerpState && controlsRef.current) {
      controlsRef.current.target.lerp(lerpState.target, 8 * delta)
      camera.position.lerp(lerpState.camPos, 8 * delta)
      controlsRef.current.update()
      invalidate()

      if (controlsRef.current.target.distanceTo(lerpState.target) < 1.0) {
        controlsRef.current.target.copy(lerpState.target)
        camera.position.copy(lerpState.camPos)
        controlsRef.current.update()
        setLerpState(null)
      }
    }

    if (!enabled || !controlsRef.current || isTypingRef.current || lerpState)
      return
    const { forward, back, left, right, rotateLeft, rotateRight } = getKeys()

    if ((rotateLeft || rotateRight) && !is2D) {
      const angle = (rotateLeft ? 1 : -1) * 2 * delta
      const offset = new THREE.Vector3()
        .copy(camera.position)
        .sub(controlsRef.current.target)
      offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle)
      camera.position.copy(controlsRef.current.target).add(offset)
      controlsRef.current.update()
      invalidate()
    }

    if (forward || back || left || right) {
      const speed = 400 * delta
      const move = new THREE.Vector3()

      camera.getWorldDirection(direction)
      direction.y = 0
      direction.normalize()
      rightVec.crossVectors(direction, camera.up).normalize()

      if (forward) move.addScaledVector(direction, speed)
      if (back) move.addScaledVector(direction, -speed)
      if (left) move.addScaledVector(rightVec, -speed)
      if (right) move.addScaledVector(rightVec, speed)

      if (move.lengthSq() > 0) {
        camera.position.add(move)
        controlsRef.current.target.add(move)
        controlsRef.current.update()
        invalidate()
      }
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
      minPolarAngle={0}
    />
  )
}

function Rack({
  id,
  colors,
  mode,
  onSelect,
  onPaint,
  viewMode,
  isSelected,
  dragDeltaRef,
  dragDeltaRotRef,
  groupCenter,
  saveToHistory,
}: {
  id: string
  colors: any
  mode: EditMode
  onSelect: (id: string, shift: boolean) => void
  onPaint: (id: string) => void
  viewMode: 'default' | 'custom'
  isSelected: boolean
  dragDeltaRef: React.MutableRefObject<THREE.Vector3>
  dragDeltaRotRef: React.MutableRefObject<number>
  groupCenter: THREE.Vector3 | null
  saveToHistory: () => void
}) {
  const data = useLabStore((state) => state.equipment[id])
  const deleteMultipleEquipment = useLabStore(
    (state) => state.deleteMultipleEquipment,
  )

  const groupRef = useRef<THREE.Group>(null)
  const textGroupRef = useRef<THREE.Group>(null)
  const isDel = mode === 'delete'

  const vOffset = useMemo(() => new THREE.Vector3(), [])
  const yAxis = useMemo(() => new THREE.Vector3(0, 1, 0), [])

  useFrame((state) => {
    const currentData = useLabStore.getState().equipment[id]

    const rackRotation = (currentData as any).rotation || 0

    if (groupRef.current) {
      if (
        isSelected &&
        groupCenter &&
        (dragDeltaRef.current.lengthSq() > 0 || dragDeltaRotRef.current !== 0)
      ) {
        vOffset.set(
          currentData.x / 10 - groupCenter.x,
          0,
          currentData.y / 10 - groupCenter.z,
        )
        vOffset.applyAxisAngle(yAxis, dragDeltaRotRef.current)

        groupRef.current.position.set(
          groupCenter.x + vOffset.x + dragDeltaRef.current.x,
          RACK_SIZE.h / 2,
          groupCenter.z + vOffset.z + dragDeltaRef.current.z,
        )
        groupRef.current.rotation.set(
          0,
          rackRotation + dragDeltaRotRef.current,
          0,
        )
      } else {
        groupRef.current.position.set(
          currentData.x / 10,
          RACK_SIZE.h / 2,
          currentData.y / 10,
        )
        groupRef.current.rotation.set(0, rackRotation, 0)
      }
    }

    if (textGroupRef.current && groupRef.current) {
      if (state.camera.type === 'OrthographicCamera')
        textGroupRef.current.visible = state.camera.zoom > 1
      else
        textGroupRef.current.visible =
          state.camera.position.distanceTo(groupRef.current.position) < 2500
    }
  })

  const rackColor = useMemo(() => {
    if (viewMode === 'custom' && (data as any).color) {
      return (data as any).color
    }
    return colors.rackBody
  }, [viewMode, (data as any).color, colors.rackBody])

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      if (e.delta > 2) return // Prevent selection if map was just dragged/panned
      e.stopPropagation()
      if (mode === 'select') return

      if (mode === 'move' || mode === 'rotate') {
        if (!isSelected) onSelect(id, e.shiftKey)
      } else if (isDel) {
        saveToHistory()
        deleteMultipleEquipment([id])
      } else if (mode === 'paint') {
        saveToHistory()
        onPaint(id)
      } else if (mode === 'view') {
        onSelect(id, e.shiftKey)
      }
    },
    [
      mode,
      isDel,
      id,
      deleteMultipleEquipment,
      onSelect,
      onPaint,
      saveToHistory,
      isSelected,
    ],
  )

  const renderAsRealMesh = isSelected
  const rackRotation = (data as any).rotation

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

      {renderAsRealMesh ? (
        <mesh geometry={rackGeometryBase} castShadow onClick={handleClick}>
          <meshStandardMaterial
            color={isDel ? '#ef4444' : rackColor}
            metalness={0.8}
            roughness={0.6}
            bumpMap={rackBumpTexture}
            bumpScale={2}
            emissive={
              viewMode === 'custom' && (data as any).color
                ? (data as any).color
                : '#000'
            }
            emissiveIntensity={
              viewMode === 'custom' && (data as any).color ? 0.6 : 0
            }
          />
        </mesh>
      ) : (
        <Instance color={isDel ? '#ef4444' : rackColor} onClick={handleClick} />
      )}

      <mesh
        position={[0, 0, RACK_SIZE.d / 2 + 0.05]}
        geometry={glassGeometryBase}
        material={innerServerMaterialBase}
      />

      <mesh
        position={[0, 0, RACK_SIZE.d / 2 + 0.15]}
        geometry={glassGeometryBase}
        material={glassMaterialBase}
      />

      <group ref={textGroupRef}>
        <Billboard position={[0, RACK_SIZE.h / 2 + 4, 0]}>
          <mesh>
            <planeGeometry args={[data.label.length * 1.2 + 2, 4]} />
            <meshBasicMaterial
              color={colors.background}
              transparent
              opacity={0.7}
            />
          </mesh>
          <Text
            fontSize={2}
            color={
              viewMode === 'custom' && (data as any).color
                ? (data as any).color
                : colors.text
            }
            fontWeight="bold"
            anchorX="center"
            anchorY="middle"
            renderOrder={100}
          >
            {data.label}
          </Text>
        </Billboard>
      </group>
    </group>
  )
}

function WallNodeRenderer({
  node,
  colors,
  mode,
  isSelected,
  dragDeltaRef,
  dragDeltaRotRef,
  groupCenter,
  onSelect,
  onDelete,
  onDrawConnect,
}: {
  node: WallNode
  colors: any
  mode: EditMode
  isSelected: boolean
  dragDeltaRef: React.MutableRefObject<THREE.Vector3>
  dragDeltaRotRef: React.MutableRefObject<number>
  groupCenter: THREE.Vector3 | null
  onSelect: (id: string, shift: boolean) => void
  onDelete: (id: string) => void
  onDrawConnect: (node: WallNode) => void
}) {
  const groupRef = useRef<THREE.Group>(null)
  const [hovered, setHovered] = useState(false)
  const yAxis = useMemo(() => new THREE.Vector3(0, 1, 0), [])
  const p1 = useMemo(() => new THREE.Vector3(), [])

  useFrame(() => {
    const currentNode = useLabStore.getState().wallNodes[node.id]

    if (
      groupRef.current &&
      isSelected &&
      groupCenter &&
      (dragDeltaRef.current.lengthSq() > 0 || dragDeltaRotRef.current !== 0)
    ) {
      p1.set(
        currentNode.x / 10 - groupCenter.x,
        0,
        currentNode.y / 10 - groupCenter.z,
      ).applyAxisAngle(yAxis, dragDeltaRotRef.current)
      const nx = groupCenter.x + p1.x + dragDeltaRef.current.x
      const nz = groupCenter.z + p1.z + dragDeltaRef.current.z
      groupRef.current.position.set(nx, WALL_H / 2, nz)
    } else if (groupRef.current) {
      groupRef.current.position.set(
        currentNode.x / 10,
        WALL_H / 2,
        currentNode.y / 10,
      )
    }
  })

  return (
    <group
      ref={groupRef}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
      }}
      onPointerOut={(e) => {
        e.stopPropagation()
        setHovered(false)
      }}
      onClick={(e) => {
        if (e.delta > 2) return // Prevent if dragged
        e.stopPropagation()
        if (mode === 'select' || mode === 'paint') return
        if (mode === 'add-wall') onDrawConnect(node)
        else if (mode === 'delete') onDelete(node.id)
        else if (['move', 'rotate', 'view'].includes(mode)) {
          if (!isSelected || mode === 'view') onSelect(node.id, e.shiftKey)
        }
      }}
    >
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[2, 2, WALL_H + 0.5, 16]} />
        <meshStandardMaterial
          color={
            mode === 'delete' && hovered
              ? '#ef4444'
              : isSelected
                ? colors.primary
                : hovered
                  ? '#f59e0b'
                  : colors.wall
          }
          roughness={0.9}
          metalness={0.05}
          bumpMap={wallBumpTexture}
          bumpScale={0.8}
          transparent
          opacity={0.95}
        />
      </mesh>
    </group>
  )
}

function WallSegmentRenderer({
  segment,
  node1,
  node2,
  colors,
  isNode1Selected,
  isNode2Selected,
  dragDeltaRef,
  dragDeltaRotRef,
  groupCenter,
  mode,
  onSelectSegment,
  onDelete,
}: {
  segment: WallSegment
  node1?: WallNode
  node2?: WallNode
  colors: any
  isNode1Selected: boolean
  isNode2Selected: boolean
  dragDeltaRef: React.MutableRefObject<THREE.Vector3>
  dragDeltaRotRef: React.MutableRefObject<number>
  groupCenter: THREE.Vector3 | null
  mode: EditMode
  onSelectSegment: (id1: string, id2: string, shift: boolean) => void
  onDelete: (id: string) => void
}) {
  const groupRef = useRef<THREE.Group>(null)
  const yAxis = useMemo(() => new THREE.Vector3(0, 1, 0), [])
  const p1 = useMemo(() => new THREE.Vector3(), [])
  const p2 = useMemo(() => new THREE.Vector3(), [])

  useFrame(() => {
    if (!groupRef.current || !node1 || !node2) return

    const n1 = useLabStore.getState().wallNodes[node1.id]
    const n2 = useLabStore.getState().wallNodes[node2.id]

    let nx1 = n1.x / 10,
      nz1 = n1.y / 10
    let nx2 = n2.x / 10,
      nz2 = n2.y / 10

    if (
      groupCenter &&
      (dragDeltaRef.current.lengthSq() > 0 || dragDeltaRotRef.current !== 0)
    ) {
      if (isNode1Selected) {
        p1.set(
          n1.x / 10 - groupCenter.x,
          0,
          n1.y / 10 - groupCenter.z,
        ).applyAxisAngle(yAxis, dragDeltaRotRef.current)
        nx1 = groupCenter.x + p1.x + dragDeltaRef.current.x
        nz1 = groupCenter.z + p1.z + dragDeltaRef.current.z
      }
      if (isNode2Selected) {
        p2.set(
          n2.x / 10 - groupCenter.x,
          0,
          n2.y / 10 - groupCenter.z,
        ).applyAxisAngle(yAxis, dragDeltaRotRef.current)
        nx2 = groupCenter.x + p2.x + dragDeltaRef.current.x
        nz2 = groupCenter.z + p2.z + dragDeltaRef.current.z
      }
    }

    const len = Math.sqrt((nx2 - nx1) ** 2 + (nz2 - nz1) ** 2)
    const ang = Math.atan2(nz2 - nz1, nx2 - nx1)

    groupRef.current.position.set((nx1 + nx2) / 2, WALL_H / 2, (nz1 + nz2) / 2)
    groupRef.current.rotation.set(0, -ang, 0)
    groupRef.current.scale.set(len || 0.1, 1, 1)
  })

  if (!node1 || !node2) return null
  const isSelected = isNode1Selected || isNode2Selected

  return (
    <group
      ref={groupRef}
      onClick={(e) => {
        if (e.delta > 2) return // Prevent if dragged
        e.stopPropagation()
        if (mode === 'select' || mode === 'paint') return
        if (mode === 'delete') onDelete(segment.id)
        else if (['move', 'rotate', 'view'].includes(mode)) {
          onSelectSegment(node1.id, node2.id, e.shiftKey)
        }
      }}
    >
      <mesh castShadow geometry={wallGeometryBase}>
        <meshStandardMaterial
          color={
            mode === 'delete'
              ? '#ef4444'
              : isSelected
                ? colors.primary
                : colors.wall
          }
          roughness={0.9}
          metalness={0.05}
          bumpMap={wallBumpTexture}
          bumpScale={0.8}
          transparent
          opacity={isSelected ? 0.95 : 0.85}
        />
      </mesh>
    </group>
  )
}

function LabelRenderer({
  label,
  colors,
  mode,
  viewMode,
  isSelected,
  dragDeltaRef,
  dragDeltaRotRef,
  groupCenter,
  onSelect,
  onDelete,
  onPaint,
  saveToHistory,
}: {
  label: LabLabel
  colors: any
  mode: EditMode
  viewMode: 'default' | 'custom'
  isSelected: boolean
  dragDeltaRef: React.MutableRefObject<THREE.Vector3>
  dragDeltaRotRef: React.MutableRefObject<number>
  groupCenter: THREE.Vector3 | null
  onSelect: (id: string, shift: boolean) => void
  onDelete: (id: string) => void
  onPaint: (id: string) => void
  saveToHistory: () => void
}) {
  const groupRef = useRef<THREE.Group>(null)
  const yAxis = useMemo(() => new THREE.Vector3(0, 1, 0), [])
  const p1 = useMemo(() => new THREE.Vector3(), [])

  useFrame(() => {
    if (!groupRef.current) return
    if (
      isSelected &&
      groupCenter &&
      (dragDeltaRef.current.lengthSq() > 0 || dragDeltaRotRef.current !== 0)
    ) {
      p1.set(
        label.x - groupCenter.x,
        0,
        label.y - groupCenter.z,
      ).applyAxisAngle(yAxis, dragDeltaRotRef.current)
      const nx = groupCenter.x + p1.x + dragDeltaRef.current.x
      const nz = groupCenter.z + p1.z + dragDeltaRef.current.z
      groupRef.current.position.set(nx, 8, nz)
    } else {
      groupRef.current.position.set(label.x, 8, label.y)
    }
  })

  const isDel = mode === 'delete'
  const displayText = label.text || label.name || 'New Label'

  return (
    <group
      ref={groupRef}
      onClick={(e) => {
        if (e.delta > 2) return // Prevent if dragged
        e.stopPropagation()
        const strId = String(label.id)
        if (mode === 'select') return
        if (mode === 'delete') {
          saveToHistory()
          onDelete(strId)
        } else if (mode === 'paint') {
          saveToHistory()
          onPaint(strId)
        } else if (['move', 'rotate', 'view'].includes(mode)) {
          if (!isSelected || mode === 'view') onSelect(strId, e.shiftKey)
        }
      }}
    >
      {isSelected && (
        <mesh position={[0, -1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[6, 32]} />
          <meshBasicMaterial
            color={colors.primary}
            transparent
            opacity={0.3}
            depthWrite={false}
          />
        </mesh>
      )}
      <Billboard>
        <Text
          fontSize={5}
          color={
            isDel
              ? '#ef4444'
              : viewMode === 'custom' && label.color
                ? label.color
                : colors.text
          }
          fontWeight="bold"
          fillOpacity={isSelected ? 1 : 0.8}
          outlineWidth={isSelected ? 0.2 : 0}
          outlineColor={colors.primary}
        >
          {displayText}
        </Text>
      </Billboard>
    </group>
  )
}

function LabelEditorPanel({
  label,
  onUpdate,
  onClose,
}: {
  label: LabLabel
  onUpdate: (id: string, text: string) => void
  onClose: () => void
}) {
  const [val, setVal] = useState(label.text || label.name || '')

  useEffect(() => {
    setVal(label.text || label.name || '')
  }, [label.text, label.name])

  return (
    <div className="absolute right-6 top-24 z-20 w-[300px] bg-card/90 backdrop-blur-xl rounded-2xl border border-border/50 shadow-2xl p-4 animate-in slide-in-from-right-8 fade-in">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <Type className="w-4 h-4" /> Edit Label
        </h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 rounded-full"
          onClick={onClose}
        >
          <X className="w-3 h-3" />
        </Button>
      </div>
      <div className="space-y-3">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1 block">
            Text Content
          </label>
          <input
            autoFocus
            type="text"
            className="w-full bg-background border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onBlur={() => {
              if (val !== (label.text || label.name))
                onUpdate(String(label.id), val)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.currentTarget.blur()
              }
            }}
          />
        </div>
      </div>
    </div>
  )
}

export function CanvasComponent3D({
  roomId,
  rooms = [],
  isLoadingRooms = false,
  onRoomChange,
  initialEquipment = [],
  initialNodes = [],
  initialSegments = [],
  initialLabels = [],
  initialSelectedId,
}: {
  roomId?: string | number
  rooms?: Array<any>
  isLoadingRooms?: boolean
  onRoomChange?: (id: string) => void
  initialEquipment?: Array<Equipment>
  initialNodes?: Array<WallNode>
  initialSegments?: Array<WallSegment>
  initialLabels?: Array<LabLabel>
  initialSelectedId?: string | number
}) {
  const initEquipment = useLabStore((state) => state.initEquipment)
  const getEquipmentArray = useLabStore((state) => state.getEquipmentArray)
  const addEquipment = useLabStore((state) => state.addEquipment)
  const updateMultipleEquipment = useLabStore(
    (state) => state.updateMultipleEquipment,
  )
  const deleteMultipleEquipment = useLabStore(
    (state) => state.deleteMultipleEquipment,
  )

  const initWallNodes = useLabStore((state) => state.initWallNodes)
  const addWallNode = useLabStore((state) => state.addWallNode)
  const updateMultipleWallNodes = useLabStore(
    (state) => state.updateMultipleWallNodes,
  )
  const deleteMultipleWallNodes = useLabStore(
    (state) => state.deleteMultipleWallNodes,
  )

  const initWallSegments = useLabStore((state) => state.initWallSegments)
  const addWallSegment = useLabStore((state) => state.addWallSegment)
  const deleteMultipleWallSegments = useLabStore(
    (state) => state.deleteMultipleWallSegments,
  )

  const hasUnsavedChanges = useLabStore((state) => state.hasUnsavedChanges)
  const markSaved = useLabStore((state) => state.markSaved)

  const equipmentIds = useLabStore(
    useShallow((state) => Object.keys(state.equipment)),
  )
  const wallNodesMap = useLabStore((state) => state.wallNodes)
  const wallSegmentsMap = useLabStore((state) => state.wallSegments)
  const wallNodes = useMemo(() => Object.values(wallNodesMap), [wallNodesMap])
  const wallSegments = useMemo(
    () => Object.values(wallSegmentsMap),
    [wallSegmentsMap],
  )

  const initStore = useRef(false)
  const prevRoomId = useRef(roomId)

  const [labels, setLabels] = useState<Array<LabLabel>>([])
  const [localUnsaved, setLocalUnsaved] = useState(false)

  const displaySaveButton = hasUnsavedChanges || localUnsaved

  const coordsRef = useRef<HTMLSpanElement>(null)

  // Prevent closing the browser tab/refreshing if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (displaySaveButton) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [displaySaveButton])

  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  const discardAction = useRef<(() => void) | null>(null)
  const cancelAction = useRef<(() => void) | null>(null)

  const displaySaveButtonRef = useRef(displaySaveButton)
  useEffect(() => {
    displaySaveButtonRef.current = displaySaveButton
  }, [displaySaveButton])

  useBlocker({
    shouldBlockFn: (opts: any) => {
      const currentLocation = opts.currentLocation || opts.current
      const nextLocation = opts.nextLocation || opts.next

      const isSamePath = currentLocation?.pathname === nextLocation?.pathname
      const isSameRoom =
        String(currentLocation?.search?.roomId) ===
        String(nextLocation?.search?.roomId)

      if (isSamePath && isSameRoom) {
        return false
      }

      if (displaySaveButtonRef.current) {
        return new Promise<boolean>((resolve) => {
          setShowUnsavedDialog(true)
          discardAction.current = () => resolve(false)
          cancelAction.current = () => resolve(true)
        })
      }
      return false
    },
  })

  const handleDiscardUnsaved = () => {
    setShowUnsavedDialog(false)
    setLocalUnsaved(false)
    markSaved()
    displaySaveButtonRef.current = false
    if (discardAction.current) {
      discardAction.current()
      discardAction.current = null
    }
  }

  const handleCancelUnsaved = () => {
    setShowUnsavedDialog(false)
    if (cancelAction.current) {
      cancelAction.current()
      cancelAction.current = null
    }
  }

  useEffect(() => {
    if (!initStore.current || prevRoomId.current !== roomId) {
      initEquipment(initialEquipment)
      initWallNodes(initialNodes)
      initWallSegments(initialSegments)

      const seenIds = new Set()
      const safeLabels = initialLabels.map((l, index) => {
        let safeId = String(l.id)
        if (seenIds.has(safeId)) {
          safeId = `${safeId}-dup-${index}-${Math.random().toString(36).substring(2, 6)}`
        }
        seenIds.add(safeId)
        return {
          ...l,
          id: safeId,
          text: l.text || l.name || 'New Label',
          name: l.name || l.text || 'New Label',
        }
      })

      setLabels(safeLabels)
      setLocalUnsaved(false)
      displaySaveButtonRef.current = false

      initStore.current = true
      prevRoomId.current = roomId
    }
  }, [
    roomId,
    initialEquipment,
    initialNodes,
    initialSegments,
    initialLabels,
    initEquipment,
    initWallNodes,
    initWallSegments,
  ])

  const prevInitialSelectedId = useRef(initialSelectedId)
  const [selectedIds, setSelectedIds] = useState<Array<string>>(
    initialSelectedId ? [String(initialSelectedId)] : [],
  )

  useEffect(() => {
    if (
      initialSelectedId &&
      initialSelectedId !== prevInitialSelectedId.current
    ) {
      setSelectedIds([String(initialSelectedId)])
      prevInitialSelectedId.current = initialSelectedId
    }
  }, [initialSelectedId])

  const [is2D, setIs2D] = useState(false)
  const [projection, setProjection] = useState<'perspective' | 'orthographic'>(
    'perspective',
  )
  const [mode, setMode] = useState<EditMode>('view')
  const [pendingRackId, setPendingRackId] = useState<string>('')
  const [useSnap, setUseSnap] = useState(true)

  const [viewMode, setViewMode] = useState<'default' | 'custom'>('default')
  const [paintColor, setPaintColor] = useState<string>('#3b82f6')

  const [wallStart, setWallStart] = useState<THREE.Vector3 | null>(null)
  const [wallStartNodeId, setWallStartNodeId] = useState<string | null>(null)

  const [focusTarget, setFocusTarget] = useState<THREE.Vector3 | null>(null)
  const lastPannedId = useRef<string | null>(null)

  const colors = useThemeColors()
  const navigate = useNavigate()
  const activeCamera = is2D ? 'orthographic' : projection

  const [rackSearchQuery, setRackSearchQuery] = useState('')

  useEffect(() => {
    if (mode === 'paint') {
      setViewMode('custom')
    }
  }, [mode])

  useEffect(() => {
    const activeSelection = selectedIds.length === 1 ? selectedIds[0] : null

    if (
      activeSelection &&
      activeSelection !== lastPannedId.current &&
      initStore.current
    ) {
      const id = String(activeSelection)

      const equipmentMap = useLabStore.getState().equipment
      if (id in equipmentMap) {
        const eq = equipmentMap[id]
        setFocusTarget(new THREE.Vector3(eq.x / 10, RACK_SIZE.h / 2, eq.y / 10))
        lastPannedId.current = activeSelection
        return
      }

      const wallNodesMapState = useLabStore.getState().wallNodes
      if (id in wallNodesMapState) {
        const nd = wallNodesMapState[id]
        setFocusTarget(new THREE.Vector3(nd.x / 10, WALL_H / 2, nd.y / 10))
        lastPannedId.current = activeSelection
        return
      }

      const lb = labels.find((l) => String(l.id) === id)
      if (lb) {
        setFocusTarget(new THREE.Vector3(lb.x, 8, lb.y))
        lastPannedId.current = activeSelection
        return
      }
    }

    if (!activeSelection) {
      lastPannedId.current = null
    }
  }, [selectedIds, labels, equipmentIds])

  const { data: allRacks } = useQuery(racksBaseListQueryOptions)

  const searchParams = new URLSearchParams(
    typeof window !== 'undefined' ? window.location.search : '',
  )
  const roomIdFromUrl = searchParams.get('roomId')

  const availableRacks = useMemo(() => {
    if (!allRacks || !Array.isArray(allRacks)) return []
    return allRacks.filter((r: ApiRackDetailItem) => {
      const isNotUsed = !equipmentIds.includes(String(r.id))

      const belongsToRoom = roomIdFromUrl
        ? r.room_id === Number(roomIdFromUrl)
        : true

      return isNotUsed && belongsToRoom
    })
  }, [allRacks, equipmentIds, roomIdFromUrl])

  const filteredRacks = useMemo(() => {
    if (!rackSearchQuery) return availableRacks
    const query = rackSearchQuery.toLowerCase()
    return availableRacks.filter(
      (r: any) =>
        (r.name || '').toLowerCase().includes(query) ||
        String(r.id).toLowerCase().includes(query),
    )
  }, [availableRacks, rackSearchQuery])

  const { historyIndex, history, saveToHistory, undo, redo } = useLabHistory(
    initEquipment,
    getEquipmentArray,
    initWallNodes,
    initWallSegments,
    setLabels,
  )

  const {
    selectStart,
    selectEnd,
    setSelectStart,
    setSelectEnd,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  } = useBoxSelection(mode, wallNodes, labels, setSelectedIds)

  const mapControlsRef = useRef<MapControlsImpl>(null)
  const [transformControlNode, setTransformControlNode] =
    useState<TransformControlsImpl | null>(null)
  const [dummyObj, setDummyObj] = useState<THREE.Group | null>(null)

  const dragStartPos = useRef<THREE.Vector3 | null>(null)
  const dragDeltaRef = useRef(new THREE.Vector3())
  const dragStartRot = useRef(0)
  const dragDeltaRotRef = useRef(0)
  const [dragDropCount, setDragDropCount] = useState(0)

  useEffect(() => {
    if (selectedIds.length === 0 || (mode !== 'move' && mode !== 'rotate')) {
      dragStartPos.current = null
      dragDeltaRef.current.set(0, 0, 0)
      dragDeltaRotRef.current = 0
    }
  }, [selectedIds, mode])

  useEffect(() => {
    if (mode !== 'add-wall') {
      setWallStart(null)
      setWallStartNodeId(null)
    }
    if (['add-rack', 'add-wall', 'add-label', 'paint'].includes(mode)) {
      setSelectedIds([])
    }
    setSelectStart(null)
    setSelectEnd(null)
  }, [mode, setSelectStart, setSelectEnd])

  const isLabel = useCallback(
    (id: string) => labels.some((l) => String(l.id) === id),
    [labels],
  )

  const selectedEquipmentData = useLabStore(
    useShallow((state) =>
      selectedIds
        .filter(
          (id) => !id.startsWith('WN') && !id.startsWith('WS') && !isLabel(id),
        )
        .map((id) => state.equipment[id])
        .filter(Boolean),
    ),
  )

  const groupCenter = useMemo(() => {
    if (selectedIds.length === 0) return null
    let x = 0,
      y = 0,
      count = 0

    selectedEquipmentData.forEach((e) => {
      x += e.x / 10
      y += e.y / 10
      count++
    })

    wallNodes
      .filter((n) => selectedIds.includes(n.id))
      .forEach((n) => {
        x += n.x / 10
        y += n.y / 10
        count++
      })

    labels
      .filter((l) => selectedIds.includes(String(l.id)))
      .forEach((l) => {
        x += l.x
        y += l.y
        count++
      })

    if (count === 0) return null
    return new THREE.Vector3(x / count, RACK_SIZE.h / 2, y / count)
  }, [selectedIds, dragDropCount, wallNodes, selectedEquipmentData, labels])

  const handleDragEnd = useCallback(() => {
    if (!dragStartPos.current) return
    saveToHistory(wallNodes, wallSegments, labels)

    const dx = dragDeltaRef.current.x
    const dz = dragDeltaRef.current.z
    const angle = dragDeltaRotRef.current
    const cx = groupCenter?.x || 0
    const cz = groupCenter?.z || 0

    const yAxis = new THREE.Vector3(0, 1, 0)
    const tempOffset = new THREE.Vector3()

    const eqUpdates = selectedEquipmentData.map((obj) => {
      tempOffset
        .set(obj.x / 10 - cx, 0, obj.y / 10 - cz)
        .applyAxisAngle(yAxis, angle)
      return {
        id: obj.id,
        updates: {
          x: snapToData(cx + tempOffset.x + dx, useSnap),
          y: snapToData(cz + tempOffset.z + dz, useSnap),
          rotation: (((obj as any).rotation || 0) + angle) % (Math.PI * 2),
        },
      }
    })
    if (eqUpdates.length > 0) updateMultipleEquipment(eqUpdates)

    const nodeIdsToUpdate = selectedIds.filter((id) => id.startsWith('WN'))
    if (nodeIdsToUpdate.length > 0) {
      const nodeUpdates = nodeIdsToUpdate
        .map((id) => wallNodesMap[id])
        .filter(Boolean)
        .map((node) => {
          tempOffset
            .set(node.x / 10 - cx, 0, node.y / 10 - cz)
            .applyAxisAngle(yAxis, angle)
          return {
            id: node.id,
            updates: {
              x: snapToData(cx + tempOffset.x + dx, useSnap),
              y: snapToData(cz + tempOffset.z + dz, useSnap),
            },
          }
        })
      updateMultipleWallNodes(nodeUpdates)
    }

    const labelIdsToUpdate = selectedIds.filter((id) => isLabel(id))
    if (labelIdsToUpdate.length > 0) {
      setLabels((prevLabels) =>
        prevLabels.map((l) => {
          if (!labelIdsToUpdate.includes(String(l.id))) return l
          tempOffset.set(l.x - cx, 0, l.y - cz).applyAxisAngle(yAxis, angle)

          const newX = cx + tempOffset.x + dx
          const newZ = cz + tempOffset.z + dz

          return {
            ...l,
            x: useSnap ? Math.round(newX) : newX,
            y: useSnap ? Math.round(newZ) : newZ,
          }
        }),
      )
      setLocalUnsaved(true)
    }

    dragStartPos.current = null
    dragDeltaRef.current.set(0, 0, 0)
    dragDeltaRotRef.current = 0
    setDragDropCount((c) => c + 1)
  }, [
    groupCenter,
    selectedEquipmentData,
    selectedIds,
    useSnap,
    saveToHistory,
    updateMultipleEquipment,
    updateMultipleWallNodes,
    wallNodesMap,
    wallNodes,
    wallSegments,
    labels,
    isLabel,
  ])

  useEffect(() => {
    if (transformControlNode && dummyObj) {
      const onDragChange = (e: any) => {
        if (mapControlsRef.current) mapControlsRef.current.enabled = !e.value
        if (e.value) {
          dragStartPos.current = dummyObj.position.clone()
          dragStartRot.current = dummyObj.rotation.y
        } else {
          handleDragEnd()
        }
      }

      const controls = transformControlNode as any
      controls.addEventListener('dragging-changed', onDragChange)
      return () =>
        controls.removeEventListener('dragging-changed', onDragChange)
    }
  }, [transformControlNode, dummyObj, handleDragEnd])

  const handleSelect = useCallback(
    (id: string | number | null, shiftKey: boolean = false) => {
      if (!id) {
        setSelectedIds([])
        return
      }

      const strId = String(id)
      let idsToSelect = [strId]

      if (strId.startsWith('WN')) {
        const targetNode = wallNodesMap[strId]
        const overlappingNodes = wallNodes.filter(
          (n) => n.x === targetNode.x && n.y === targetNode.y,
        )
        idsToSelect = overlappingNodes.map((n) => n.id)
      }

      setSelectedIds((prev) => {
        if (shiftKey) {
          const isSelected = prev.includes(strId)
          if (isSelected) return prev.filter((i) => !idsToSelect.includes(i))
          return Array.from(new Set([...prev, ...idsToSelect]))
        }
        return idsToSelect
      })

      if (
        !shiftKey &&
        mode === 'view' &&
        !strId.startsWith('WN') &&
        !strId.startsWith('WS') &&
        !isLabel(strId)
      ) {
        navigate({
          to: '/map',
          search: (prev: any) => ({
            ...prev,
            redirectId: strId,
            redirectType: 'rack',
          }),
          replace: true,
        })
      }
    },
    [navigate, mode, wallNodes, wallNodesMap, isLabel],
  )

  const handlePaint = useCallback(
    (rawId: string | number) => {
      const id = String(rawId)
      if (isLabel(id)) {
        setLabels((prev) =>
          prev.map((l) =>
            String(l.id) === id ? { ...l, color: paintColor } : l,
          ),
        )
        setLocalUnsaved(true)
      } else {
        updateMultipleEquipment([{ id, updates: { color: paintColor } }])
      }
    },
    [updateMultipleEquipment, paintColor, isLabel],
  )

  const handlePlanePointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      handlePointerMove(e)
      if (coordsRef.current) {
        const x = (useSnap ? Math.round(e.point.x) : e.point.x).toFixed(1)
        const z = (useSnap ? Math.round(e.point.z) : e.point.z).toFixed(1)
        coordsRef.current.innerText = `X: ${x} | Y: ${z}`
      }
    },
    [handlePointerMove, useSnap],
  )

  const handleGridClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 2) return // Ignore click if user was dragging/panning the map
    if (
      mode === 'select' ||
      mode === 'move' ||
      mode === 'rotate' ||
      mode === 'paint'
    )
      return
    if (mode === 'view') {
      setSelectedIds([])
      navigate({
        to: '/map',
        search: (prev: any) => ({
          ...prev,
          redirectId: undefined,
          redirectType: undefined,
        }),
        replace: true,
      })
      return
    }

    e.stopPropagation()
    const pt = new THREE.Vector3(
      useSnap ? Math.round(e.point.x) : e.point.x,
      0,
      useSnap ? Math.round(e.point.z) : e.point.z,
    )
    saveToHistory(wallNodes, wallSegments, labels)

    if (mode === 'add-rack') {
      if (!pendingRackId) {
        toast.error('Please select a rack to place first')
        return
      }

      const selectedRack = availableRacks.find(
        (r: any) => String(r.id) === pendingRackId,
      )

      addEquipment({
        id: pendingRackId,
        x: pt.x * 10,
        y: pt.z * 10,
        rotation: 0,
        type: 'rack',
        label: selectedRack?.name || `Rack ${pendingRackId}`,
      } as any)

      setPendingRackId('')
      setRackSearchQuery('')
      setMode('view')
    } else if (mode === 'add-wall') {
      const clickedPt = new THREE.Vector2(pt.x * 10, pt.z * 10)
      const targetNode = wallNodes.find(
        (n) => new THREE.Vector2(n.x, n.y).distanceTo(clickedPt) < 30,
      )

      if (!wallStart) {
        let startNodeId
        if (targetNode) {
          startNodeId = targetNode.id
          setWallStart(
            new THREE.Vector3(targetNode.x / 10, 0, targetNode.y / 10),
          )
        } else {
          startNodeId = `WN-${Date.now()}`
          addWallNode({ id: startNodeId, x: pt.x * 10, y: pt.z * 10 })
          setWallStart(pt)
        }
        setWallStartNodeId(startNodeId)
      } else {
        let endNodeId
        let endPt
        if (targetNode) {
          endNodeId = targetNode.id
          endPt = new THREE.Vector3(targetNode.x / 10, 0, targetNode.y / 10)
        } else {
          endNodeId = `WN-${Date.now()}`
          addWallNode({ id: endNodeId, x: pt.x * 10, y: pt.z * 10 })
          endPt = pt
        }

        if (wallStartNodeId !== endNodeId) {
          addWallSegment({
            id: `WS-${Date.now()}`,
            node1Id: wallStartNodeId!,
            node2Id: endNodeId,
          })
          setWallStart(endPt)
          setWallStartNodeId(endNodeId)
        }
      }
    } else if (mode === 'add-label') {
      const newLabelId = `L-${Date.now()}-${Math.floor(Math.random() * 1000)}`
      setLabels([
        ...labels,
        {
          id: newLabelId,
          text: 'New Label',
          name: 'New Label',
          x: pt.x,
          y: pt.z,
          color: undefined,
        },
      ])
      setLocalUnsaved(true)
      setMode('view')
      setSelectedIds([newLabelId])
    }
  }

  const sceneCenter = useMemo(() => {
    const eqArray = getEquipmentArray()
    if (!eqArray.length) return new THREE.Vector3(0, 0, 0)
    const avgX = eqArray.reduce((acc, e) => acc + e.x, 0) / eqArray.length
    const avgY = eqArray.reduce((acc, e) => acc + e.y, 0) / eqArray.length
    return new THREE.Vector3(avgX / 10, 0, avgY / 10)
  }, [equipmentIds.length, getEquipmentArray])

  const { mutateAsync: syncMap } = useSyncRoomMap(roomId || '')

  const handleSaveToBackend = async () => {
    try {
      await syncMap({
        equipment: getEquipmentArray(),
        wallNodes: Object.values(useLabStore.getState().wallNodes),
        wallSegments: Object.values(useLabStore.getState().wallSegments),
        labels: labels.map((l) => ({
          ...l,
          name: l.text || l.name || 'New Label',
          text: l.text || l.name || 'New Label',
        })),
      })

      setTimeout(() => {
        markSaved()
        setLocalUnsaved(false)
        displaySaveButtonRef.current = false
      }, 500)
      toast.success('Map layout saved successfully')
    } catch (error) {
      console.error('Save failed:', error)
      toast.error('Failed to save map layout')
    }
  }

  const deleteSelection = () => {
    saveToHistory(wallNodes, wallSegments, labels)
    const eqIds = selectedIds.filter(
      (id) => !id.startsWith('WN') && !id.startsWith('WS') && !isLabel(id),
    )
    const nodeIds = selectedIds.filter((id) => id.startsWith('WN'))
    const segIds = selectedIds.filter((id) => id.startsWith('WS'))
    const labelIds = selectedIds.filter((id) => isLabel(id))

    const orphanedSegs = wallSegments
      .filter((s) => nodeIds.includes(s.node1Id) || nodeIds.includes(s.node2Id))
      .map((s) => s.id)

    const allSegIdsToDelete = Array.from(new Set([...segIds, ...orphanedSegs]))

    if (eqIds.length > 0) deleteMultipleEquipment(eqIds)
    if (nodeIds.length > 0) deleteMultipleWallNodes(nodeIds)
    if (allSegIdsToDelete.length > 0)
      deleteMultipleWallSegments(allSegIdsToDelete)

    if (labelIds.length > 0) {
      setLabels((prev) => prev.filter((l) => !labelIds.includes(String(l.id))))
      setLocalUnsaved(true)
    }

    setSelectedIds([])
  }

  const handleUndo = () => {
    undo(wallNodes, wallSegments, labels)
    setLocalUnsaved(true)
  }

  const handleRedo = () => {
    redo()
    setLocalUnsaved(true)
  }

  return (
    <div
      className="relative w-full h-full bg-background flex min-w-0 overflow-hidden outline-none"
      tabIndex={0}
      onMouseDown={(e) => e.currentTarget.focus()}
    >
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20">
        {onRoomChange && (
          <Select
            value={roomId?.toString()}
            onValueChange={(val) => {
              if (displaySaveButtonRef.current) {
                setShowUnsavedDialog(true)
                discardAction.current = () => {
                  onRoomChange(val)
                }
                cancelAction.current = () => {}
              } else {
                onRoomChange(val)
              }
            }}
            disabled={isLoadingRooms}
          >
            <SelectTrigger className="bg-card/80 backdrop-blur-xl border border-border/50 shadow-lg rounded-full h-12 px-6 flex items-center justify-between gap-3 text-sm font-semibold hover:bg-card/90 transition-colors w-fit">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                <SelectValue
                  placeholder={isLoadingRooms ? 'Loading...' : 'Select Room'}
                />
              </div>
            </SelectTrigger>
            <SelectContent
              position="popper"
              align="center"
              className="rounded-2xl shadow-xl border-border/50"
            >
              {rooms.map((room: any) => (
                <SelectItem
                  key={room.id}
                  value={room.id.toString()}
                  className="py-2.5 px-4 rounded-xl cursor-pointer"
                >
                  <span className="font-medium">
                    {room.name || `Room ${room.id}`}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="absolute top-6 right-6 z-20 flex items-center gap-3">
        <div className="flex bg-card/80 backdrop-blur-xl border border-border/50 shadow-lg rounded-full p-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full"
            onClick={handleUndo}
            disabled={historyIndex < 0}
          >
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full"
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
          >
            <Redo2 className="w-4 h-4" />
          </Button>
        </div>

        {displaySaveButton && (
          <Button
            onClick={handleSaveToBackend}
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-900/20 rounded-full h-11 px-5 animate-in fade-in zoom-in-95 duration-200"
          >
            <Save className="w-4 h-4 mr-2" /> Save Layout
          </Button>
        )}
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-4 pointer-events-none">
        {selectedIds.length > 0 && (
          <div className="pointer-events-auto flex items-center gap-2 backdrop-blur-xl bg-primary/10 p-1.5 rounded-full border border-primary/20 shadow-2xl animate-in slide-in-from-bottom-2 fade-in">
            <Badge variant="default" className="ml-2 rounded-full font-bold">
              {selectedIds.length} Selected
            </Badge>
            <div className="w-px h-4 bg-primary/20 mx-1" />
            <Button
              size="sm"
              variant="ghost"
              className="h-8 rounded-full hover:bg-primary/20 hover:text-primary"
              onClick={() => setSelectedIds([])}
            >
              <X className="w-4 h-4 mr-1" /> Clear
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="h-8 rounded-full"
              onClick={deleteSelection}
            >
              <Trash2 className="w-4 h-4 mr-1" /> Delete
            </Button>
          </div>
        )}

        {mode === 'add-rack' && (
          <div className="pointer-events-auto flex flex-col gap-3 p-4 bg-card/90 backdrop-blur-xl rounded-3xl border border-border/50 shadow-2xl animate-in slide-in-from-bottom-2 fade-in w-full max-w-[500px] max-h-[400px]">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between px-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                  <Server className="w-3 h-3" /> Select a Rack to Place
                </span>
                <Badge variant="secondary" className="rounded-full text-[10px]">
                  {filteredRacks.length} Available
                </Badge>
              </div>

              <div className="relative px-2">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search racks..."
                  value={rackSearchQuery}
                  onChange={(e) => setRackSearchQuery(e.target.value)}
                  className="w-full bg-background/50 border border-border/50 rounded-xl pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
                />
              </div>
            </div>

            <ScrollArea className="w-full px-2">
              <div className="grid grid-cols-2 gap-2 pb-2">
                {filteredRacks.length === 0 ? (
                  <div className="col-span-2 text-center text-sm text-muted-foreground py-8 italic bg-muted/5 rounded-xl border border-dashed border-border/50">
                    {rackSearchQuery
                      ? 'No matching racks found'
                      : 'No racks available to place'}
                  </div>
                ) : (
                  filteredRacks.map((r: any) => (
                    <Button
                      key={r.id}
                      variant={
                        pendingRackId === String(r.id) ? 'default' : 'outline'
                      }
                      className={`flex items-center justify-start gap-2 h-10 px-3 rounded-xl transition-all ${
                        pendingRackId === String(r.id)
                          ? 'shadow-md ring-1 ring-primary/50'
                          : 'hover:border-primary/50 hover:bg-primary/5'
                      }`}
                      onClick={() => setPendingRackId(String(r.id))}
                    >
                      <Server
                        className={`w-3.5 h-3.5 shrink-0 ${
                          pendingRackId === String(r.id)
                            ? 'text-primary-foreground'
                            : 'text-primary'
                        }`}
                      />
                      <span className="font-bold text-xs truncate">
                        {r.name || `Rack #${r.id}`}
                      </span>
                    </Button>
                  ))
                )}
              </div>
              <ScrollBar orientation="vertical" className="w-1.5" />
            </ScrollArea>
          </div>
        )}

        {mode === 'paint' && (
          <div className="pointer-events-auto flex items-center gap-3 p-2 pr-3 bg-card/90 backdrop-blur-xl rounded-full border border-border/50 shadow-2xl animate-in slide-in-from-bottom-2 fade-in">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-3 flex items-center gap-2">
              <Palette className="w-3 h-3" /> Select Color
            </span>
            <div className="w-px h-4 bg-border/50" />
            <div className="flex gap-1.5">
              {[
                { color: '#ef4444', label: 'Red' },
                { color: '#f97316', label: 'Orange' },
                { color: '#eab308', label: 'Yellow' },
                { color: '#84cc16', label: 'Lime' },
                { color: '#10b981', label: 'Emerald' },
                { color: '#06b6d4', label: 'Cyan' },
                { color: '#3b82f6', label: 'Blue' },
                { color: '#8b5cf6', label: 'Violet' },
                { color: '#d946ef', label: 'Fuchsia' },
                { color: '#f43f5e', label: 'Rose' },
              ].map((c) => (
                <button
                  key={c.color}
                  className={`w-6 h-6 rounded-full transition-all hover:scale-110 ${paintColor === c.color ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-110' : 'ring-1 ring-border shadow-sm'}`}
                  style={{ backgroundColor: c.color }}
                  onClick={() => setPaintColor(c.color)}
                  title={c.label}
                />
              ))}
            </div>
          </div>
        )}

        <div className="pointer-events-auto">
          <MapToolbar
            mode={mode}
            setMode={(v) => {
              setMode(v as EditMode)
              if (v !== 'add-rack') {
                setPendingRackId('')
                setRackSearchQuery('')
              }
            }}
          />
        </div>
      </div>

      {/* Coordinate Map Overlay */}
      <div className="absolute bottom-6 right-6 z-20 pointer-events-none bg-card/80 backdrop-blur-xl border border-border/50 text-muted-foreground px-4 py-2 rounded-full text-[11px] font-bold tracking-widest tabular-nums shadow-lg">
        <span ref={coordsRef}>X: 0.0 | Y: 0.0</span>
      </div>

      <div className="absolute top-1/2 right-9 -translate-y-1/2 z-20 flex flex-col items-center pointer-events-none">
        <div className="pointer-events-auto">
          <ViewSettings
            viewMode={viewMode}
            setViewMode={setViewMode}
            useSnap={useSnap}
            setUseSnap={setUseSnap}
            is2D={is2D}
            setIs2D={setIs2D}
            projection={projection}
            setProjection={setProjection}
          />
        </div>
      </div>

      <div className="flex-1 relative h-full min-w-0">
        <KeyboardControls
          map={[
            { name: 'forward', keys: ['ArrowUp', 'KeyW'] },
            { name: 'back', keys: ['ArrowDown', 'KeyS'] },
            { name: 'left', keys: ['ArrowLeft', 'KeyA'] },
            { name: 'right', keys: ['ArrowRight', 'KeyD'] },
            { name: 'rotateLeft', keys: ['KeyQ'] },
            { name: 'rotateRight', keys: ['KeyE'] },
          ]}
        >
          <Canvas
            shadows
            dpr={[1, 2]}
            gl={{ antialias: true, logarithmicDepthBuffer: true }}
          >
            <Suspense fallback={null}>
              <GizmoHelper alignment="bottom-right" margin={[100, 120]}>
                <GizmoViewport />
              </GizmoHelper>
              <PerspectiveCamera
                makeDefault={activeCamera === 'perspective'}
                position={[150, 200, 150]}
                fov={45}
                far={2000}
              />
              <OrthographicCamera
                makeDefault={activeCamera === 'orthographic'}
                position={[0, 600, 0]}
                zoom={is2D ? 15 : 6}
                near={-500}
                far={2000}
              />
              <SceneController
                is2D={is2D}
                activeCamera={activeCamera}
                center={mode === 'view' ? sceneCenter : undefined}
                enabled={mode !== 'select'}
                controlsRef={mapControlsRef}
                focusTarget={focusTarget}
              />

              <ambientLight intensity={0.6} />
              <pointLight
                position={[100, 200, 100]}
                castShadow
                intensity={3}
                shadow-bias={-0.0005}
                shadow-mapSize={1024}
              />
              <Environment preset="warehouse" />

              <mesh
                rotation={[-Math.PI / 2, 0, 0]}
                position={[0, -0.05, 0]}
                onClick={handleGridClick}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePlanePointerMove}
                onPointerUp={handlePointerUp}
              >
                <planeGeometry args={[10000, 10000]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
              </mesh>

              {mode === 'select' && selectStart && selectEnd && (
                <mesh
                  position={[
                    (selectStart.x + selectEnd.x) / 2,
                    0.5,
                    (selectStart.z + selectEnd.z) / 2,
                  ]}
                  rotation={[-Math.PI / 2, 0, 0]}
                >
                  <planeGeometry
                    args={[
                      Math.abs(selectStart.x - selectEnd.x) || 0.1,
                      Math.abs(selectStart.z - selectEnd.z) || 0.1,
                    ]}
                  />
                  <meshBasicMaterial
                    color={colors.primary}
                    transparent
                    opacity={0.3}
                    side={THREE.DoubleSide}
                  />
                </mesh>
              )}

              <Grid
                infiniteGrid
                cellSize={10}
                sectionSize={50}
                cellColor={colors.grid}
                sectionColor={colors.primary}
                fadeDistance={1500}
                fadeStrength={1}
                cellThickness={1}
                sectionThickness={1}
                position={[0, -0.01, 0]}
              />

              {selectedIds.length > 0 &&
                (mode === 'move' || mode === 'rotate') &&
                groupCenter && (
                  <group key={selectedIds.join('-') + dragDropCount}>
                    <group ref={setDummyObj} position={groupCenter} />
                    {dummyObj && (
                      <TransformControls
                        ref={setTransformControlNode}
                        object={dummyObj}
                        mode={mode === 'rotate' ? 'rotate' : 'translate'}
                        showX={mode !== 'rotate'}
                        showZ={mode !== 'rotate'}
                        showY={mode === 'rotate'}
                        translationSnap={useSnap ? 1 : null}
                        rotationSnap={useSnap ? Math.PI / 4 : null}
                        onChange={() => {
                          if (dragStartPos.current) {
                            dragDeltaRef.current
                              .copy(dummyObj.position)
                              .sub(dragStartPos.current)
                            dragDeltaRotRef.current =
                              dummyObj.rotation.y - dragStartRot.current
                          }
                        }}
                      />
                    )}
                  </group>
                )}

              <Instances
                limit={5000}
                geometry={rackGeometryBase}
                castShadow
                receiveShadow
                frustumCulled={false}
              >
                {viewMode === 'default' ? (
                  <meshStandardMaterial
                    metalness={0.8}
                    roughness={0.6}
                    color="#ffffff"
                    bumpMap={rackBumpTexture}
                    bumpScale={2}
                  />
                ) : (
                  <meshBasicMaterial color="#ffffff" />
                )}
                {equipmentIds.map((id) => (
                  <Rack
                    key={id}
                    id={id}
                    colors={colors}
                    mode={mode}
                    viewMode={viewMode}
                    isSelected={selectedIds.includes(id)}
                    groupCenter={groupCenter}
                    dragDeltaRef={dragDeltaRef}
                    dragDeltaRotRef={dragDeltaRotRef}
                    onSelect={handleSelect}
                    onPaint={handlePaint}
                    saveToHistory={() =>
                      saveToHistory(wallNodes, wallSegments, labels)
                    }
                  />
                ))}
              </Instances>

              {wallNodes.map((n) => (
                <WallNodeRenderer
                  key={n.id}
                  node={n}
                  colors={colors}
                  mode={mode}
                  isSelected={selectedIds.includes(n.id)}
                  groupCenter={groupCenter}
                  dragDeltaRef={dragDeltaRef}
                  dragDeltaRotRef={dragDeltaRotRef}
                  onSelect={handleSelect}
                  onDelete={(id) => {
                    saveToHistory(wallNodes, wallSegments, labels)
                    const orphaned = wallSegments
                      .filter((s) => s.node1Id === id || s.node2Id === id)
                      .map((s) => s.id)
                    deleteMultipleWallNodes([id])
                    if (orphaned.length) deleteMultipleWallSegments(orphaned)
                  }}
                  onDrawConnect={(node) => {
                    if (mode === 'add-wall') {
                      saveToHistory(wallNodes, wallSegments, labels)
                      if (!wallStart) {
                        setWallStart(
                          new THREE.Vector3(node.x / 10, 0, node.y / 10),
                        )
                        setWallStartNodeId(node.id)
                      } else if (
                        wallStartNodeId &&
                        wallStartNodeId !== node.id
                      ) {
                        const newSeg = {
                          id: `WS-${Date.now()}`,
                          node1Id: wallStartNodeId,
                          node2Id: node.id,
                        }
                        addWallSegment(newSeg)
                        setWallStart(
                          new THREE.Vector3(node.x / 10, 0, node.y / 10),
                        )
                        setWallStartNodeId(node.id)
                      }
                    }
                  }}
                />
              ))}

              {wallSegments.map((s) => (
                <WallSegmentRenderer
                  key={s.id}
                  segment={s}
                  node1={wallNodesMap[s.node1Id]}
                  node2={wallNodesMap[s.node2Id]}
                  colors={colors}
                  mode={mode}
                  isNode1Selected={selectedIds.includes(s.node1Id)}
                  isNode2Selected={selectedIds.includes(s.node2Id)}
                  groupCenter={groupCenter}
                  dragDeltaRef={dragDeltaRef}
                  dragDeltaRotRef={dragDeltaRotRef}
                  onSelectSegment={(id1, id2, shift) =>
                    setSelectedIds((prev) =>
                      shift
                        ? Array.from(new Set([...prev, id1, id2]))
                        : [id1, id2],
                    )
                  }
                  onDelete={(id) => {
                    saveToHistory(wallNodes, wallSegments, labels)
                    deleteMultipleWallSegments([id])
                  }}
                />
              ))}

              {labels.map((l) => (
                <LabelRenderer
                  key={String(l.id)}
                  label={l}
                  colors={colors}
                  mode={mode}
                  viewMode={viewMode}
                  isSelected={selectedIds.includes(String(l.id))}
                  groupCenter={groupCenter}
                  dragDeltaRef={dragDeltaRef}
                  dragDeltaRotRef={dragDeltaRotRef}
                  onSelect={handleSelect}
                  onDelete={(id) => {
                    setLabels((prev) =>
                      prev.filter((lb) => String(lb.id) !== id),
                    )
                    setLocalUnsaved(true)
                  }}
                  onPaint={handlePaint}
                  saveToHistory={() =>
                    saveToHistory(wallNodes, wallSegments, labels)
                  }
                />
              ))}

              <GhostPreview
                mode={mode}
                wallStart={wallStart}
                wallNodes={wallNodes}
                useSnap={useSnap}
              />
              <ContactShadows
                opacity={0.4}
                scale={1000}
                blur={2.5}
                far={15}
                resolution={256}
                color="#000000"
              />
            </Suspense>
          </Canvas>
        </KeyboardControls>

        <ControlsOverlay is2D={is2D} />

        <Loader
          containerStyles={{ background: 'var(--background)' }}
          innerStyles={{ backgroundColor: 'var(--card)' }}
          barStyles={{ backgroundColor: 'var(--primary)' }}
        />
      </div>

      <AlertDialog
        open={showUnsavedDialog}
        onOpenChange={(open) => {
          if (!open) handleCancelUnsaved()
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
              <AlertTriangle />
            </AlertDialogMedia>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes in the current laboratory. If you switch
              laboratories or navigate away, your unsaved progress will be lost.
              Are you sure you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelUnsaved} variant="outline">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDiscardUnsaved()
              }}
              variant="destructive"
            >
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selectedIds.length === 1 &&
        isLabel(selectedIds[0]) &&
        mode === 'view' && (
          <LabelEditorPanel
            key={selectedIds[0]}
            label={labels.find((l) => String(l.id) === selectedIds[0])!}
            onUpdate={(id, text) => {
              saveToHistory(wallNodes, wallSegments, labels)
              setLabels((prev) =>
                prev.map((l) =>
                  String(l.id) === id ? { ...l, text, name: text } : l,
                ),
              )
              setLocalUnsaved(true)
            }}
            onClose={() => setSelectedIds([])}
          />
        )}

      {selectedIds.length === 1 &&
        getEquipmentArray().find((e) => e.id === selectedIds[0]) &&
        mode === 'view' && (
          <RackInfoPanel
            rack={getEquipmentArray().find((e) => e.id === selectedIds[0])!}
            onClose={() => setSelectedIds([])}
          />
        )}
    </div>
  )
}
