import type { InventoryResponse } from '@/integrations/inventory/inventory.types'

export interface ApiCategoryItem {
  id: number
  name: string
}

export interface ApiCategoryInventoryGrouped {
  id: number
  category_name: string
  quantity: number
  item_group: Array<InventoryResponse>
}

export type ApiCategoryResponse = Array<ApiCategoryItem>
export type ApiCategoryInventoryGroupedResponse =
  Array<ApiCategoryInventoryGrouped>
