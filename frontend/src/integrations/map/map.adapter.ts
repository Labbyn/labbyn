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
    if (e.id) entityDbIds.set(e.name, e.id)
    return {
      id: e.name,
      type: e.eq_type,
      x: e.x,
      y: e.y,
      rotation: e.rotation,
      label: e.label || '',
    }
  })

  const labels = apiData.labels.map((l) => {
    if (l.id) entityDbIds.set(l.name, l.id)
    return { id: l.name, text: l.name, x: l.x, y: l.y }
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
    equipment: feData.equipment.map((e) => ({
      id: entityDbIds.get(e.id) || null,
      name: e.id,
      eq_type: e.type || 'rack',
      x: e.x,
      y: e.y,
      rotation: e.rotation || 0,
      label: e.label || null,
      rack_id: null,
    })),
    labels: feData.labels.map((l) => ({
      id: entityDbIds.get(l.id) || null,
      name: l.text,
      x: l.x,
      y: l.y,
      color: '#ffffff',
    })),
  }
}
