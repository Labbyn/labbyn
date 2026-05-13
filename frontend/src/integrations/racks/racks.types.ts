import type { ApiTagsItem } from '@/integrations/tags/tags.types'
import type { ApiShelfItem } from '@/integrations/shelves/shelves.types'

export interface ApiRackDetailItem {
  name: string
  room_id: number
  layout_id: number
  team_id: number
  id: number
  team_name: string
  tags: Array<ApiTagsItem>
  machines: Array<Array<ApiRackDetailMachineItem>>
  shelves: Array<ApiShelfItem>
  room_name: string
}

export interface ApiRackDetailMachineItem {
  id: number
  name: string
  ip_address: string
  mac_address: string
  team_id: number
  machine_url: string | null
}

export interface ApiRacksList {
  racks: Array<ApiRacksListItem>
}

export interface ApiRacksListItem {
  id: number
  name: string
}

export interface ApiUpdateRack {
  name?: string
  room_id?: number
  team_id?: number
  tag_ids?: Array<string>
  machines?: Array<
    Array<{
      id: number
      name: string
      ip_address: string
      mac_address: string
      team_id: number
      machine_url: string | null
    }>
  >
}

export type ApiRackListResponse = Array<ApiRackDetailItem>
