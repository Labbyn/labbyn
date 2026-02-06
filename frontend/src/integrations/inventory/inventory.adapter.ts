import type { ApiInventoryItem } from './inventory.types'

export type ApiInventoryResponse = Array<ApiInventoryItem>

export function fetchInventoryData(apiData: ApiInventoryResponse) {
  return apiData
}

// fetch single item from inventory list
export function fetchInventoryItemData(apiData: ApiInventoryItem) {
  return apiData
}
