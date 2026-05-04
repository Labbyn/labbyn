import { InventoryResponse } from from '@/integrations/invenory/inventory.types'

export interface ApiCategoryItem {
  id: number
  name: string
}

export interface ApiCategoryInventoryGrouped {
  category_name: string
  quantity: number
  item_group: Array<InventoryResponse>
}


export type ApiCategoryResponse = Array<ApiCategoryItem>
export type ApiCategoryInventoryGroupedResponse = Array<ApiCategoryInventoryGrouped>