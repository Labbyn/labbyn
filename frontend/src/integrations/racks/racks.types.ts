import type { ApiTagsItem } from '@/integrations/tags/tags.types'

export interface ApiRackDetailItem {
  name: string
  room_id: number
  layout_id: number
  team_id: number
  id: number
  team_name: string
  tags: Array<ApiTagsItem>
  machines: Array<Array<ApiRackDetailMachineItem>>
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
