export interface InventoryResponse {
  id: number
  name: string
  quantity: number
  team_id: number | null
  localization_id: number
  machine_id: number | null
  category_id: number
  rental_status: boolean
  rental_id: number | null
  version_id: number
}

export interface ApiInventoryInfoItem {
  id: number
  name: string
  quantity: number | null
  team_name: string | null
  room_name: string | null
  machine_info: string | null
  category_name: string | null
  location_link: string
  active_rentals: Array<any>
  room_id: number | null
}

export interface ApiUpdateInventory {
  name?: string
  quantity?: number
  team_id?: number | null
  localization_id?: number
  machine_id?: number | null
  category_id?: number
  rental_status?: boolean
  rental_id?: number | null
}

export interface ApiInventoryInfoGroupedResponse {
  model_id: number
  model_name: string
  category_name: string
  model_items: Array<ApiInventoryInfoItem>
}

export type ApiInventoryItem = InventoryResponse
export type ApiInventoryResponse = Array<InventoryResponse>

export type ApiInventoryInfoResponse = Array<ApiInventoryInfoItem>
