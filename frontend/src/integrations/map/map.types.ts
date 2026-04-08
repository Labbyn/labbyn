export interface ApiNode {
  id: number | null
  name: string
  x: number
  y: number
}

export interface ApiSegment {
  id: number | null
  name: string
  node1_name: string
  node2_name: string
}

export interface ApiEquipment {
  id: number | null
  name: string
  eq_type: string
  x: number
  y: number
  rotation: number
  label: string | null
  rack_id: number | null
}

export interface ApiLabel {
  id: number | null
  name: string
  x: number
  y: number
  color: string
}

export interface MapResponse {
  id: number
  room_id: number
  nodes: Array<ApiNode>
  segments: Array<ApiSegment>
  equipment: Array<ApiEquipment>
  labels: Array<ApiLabel>
}

export interface MapPatchPayload {
  wall_nodes: Array<ApiNode>
  wall_segments: Array<ApiSegment>
  equipment: Array<ApiEquipment>
  labels: Array<ApiLabel>
}
