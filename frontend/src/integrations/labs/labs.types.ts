import type { ApiTagsItem } from '@/integrations/tags/tags.types'

export interface ApiLabsItem {
  id: number
  name: string
  team_name: string
  rack_count: number
  map_link: string
}

export interface ApiLabsDetailItem {
  id: number
  name: string
  tags: Array<ApiTagsItem>
  map_link: string
  racks: Array<ApiLabsDetailRack>
}

// Rack inside lab subpage
export interface ApiLabsDetailRack {
  id: number
  name: string
  tags: Array<ApiTagsItem>
  machines: Array<ApiLabsDetailRackMachine>
}

// Machine inside rack
export interface ApiLabsDetailRackMachine {
  id: number
  hostname: string
  ip_address: string
  mac_address: string
}

export type ApiLabsResponse = Array<ApiLabsItem>
