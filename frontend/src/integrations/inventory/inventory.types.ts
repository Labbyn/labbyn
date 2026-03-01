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
   total_quantity: number
   in_stock_quantity: number
   team_name: string
   room_name: string
   machine_info: string
   category_name: string
   location_link: string
   active_rentals: Array<any>
}

export type ApiInventoryItem = InventoryResponse
export type ApiInventoryResponse = Array<InventoryResponse>

export type ApiInventoryInfoResponse = Array<ApiInventoryInfoResponse