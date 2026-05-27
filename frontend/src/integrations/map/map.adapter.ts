import type { Equipment, WallNode, WallSegment } from '@/types/types'
import type { MapPatchPayload, MapResponse } from './map.types'

export const entityDbIds = new Map<string, number>()

export interface FrontendMapData {
  equipment: Array<Equipment>
  wallNodes: Array<WallNode>
  wallSegments: Array<WallSegment>
  labels: Array<any>
}

export const adaptMapToFrontend = (apiData: MapResponse): FrontendMapData => {
  const wallNodes: Array<WallNode> = apiData.nodes.map((n) => {
    if (n.id) entityDbIds.set(n.name, n.id)
    return { id: n.name, x: n.x, y: n.y }
  })

  const wallSegments: Array<WallSegment> = apiData.segments.map((s) => {
    if (s.id) entityDbIds.set(s.name, s.id)
    return { id: s.name, node1Id: s.node1_name, node2Id: s.node2_name }
  })

  const equipment: Array<Equipment> = apiData.equipment.map((e) => {
    const feId = e.id ? String(e.id) : e.name

    if (e.id) {
      entityDbIds.set(feId, e.id)
      entityDbIds.set(e.name, e.id)
    }

    return {
      id: feId,
      type: e.eq_type,
      x: e.x,
      y: e.y,
      rotation: e.rotation,
      label: e.label || '',
      name: e.name,
      color: (e as any).color || undefined,
    } as any
  })

  const labels = apiData.labels.map((l) => {
    const feId = l.id ? String(l.id) : `L-${Date.now()}-${Math.random()}`

    if (l.id) {
      entityDbIds.set(feId, l.id)
    }

    return {
      id: feId,
      text: l.name,
      name: l.name,
      x: l.x,
      y: l.y,
      color: l.color,
    }
  })

  return { wallNodes, wallSegments, equipment, labels }
}

export const adaptMapToBackend = (feData: FrontendMapData): MapPatchPayload => {
  return {
    wall_nodes: feData.wallNodes.map((n) => ({
      id: entityDbIds.get(n.id) || null,
      name: n.id,
      x: n.x,
      y: n.y,
    })),
    wall_segments: feData.wallSegments.map((s) => ({
      id: entityDbIds.get(s.id) || null,
      name: s.id,
      node1_name: s.node1Id,
      node2_name: s.node2Id,
    })),
    equipment: feData.equipment.map((e) => {
      const parsedId = Number(e.id)
      const dbId = !isNaN(parsedId)
        ? parsedId
        : entityDbIds.get(String(e.id)) || null

      return {
        id: dbId,
        name: (e as any).name || String(e.id),
        eq_type: e.type || 'rack',
        x: e.x,
        y: e.y,
        rotation: e.rotation || 0,
        label: e.label || null,
        rack_id: null,
        color: (e as any).color || null,
      }
    }),
    labels: feData.labels.map((l) => {
      const parsedId = Number(l.id)
      const dbId = !isNaN(parsedId)
        ? parsedId
        : entityDbIds.get(String(l.id)) || null

      return {
        id: dbId,
        name: l.text || l.name || 'New Label',
        x: l.x,
        y: l.y,
        color: l.color || '#ffffff',
      }
    }),
  }
}
