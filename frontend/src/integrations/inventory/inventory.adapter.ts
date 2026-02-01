import type { ApiInventoryItem } from './inventory.types'

export type ApiInventoryResponse = Array<ApiInventoryItem>

export function fetchInventoryData(apiData: ApiInventoryResponse) {
  return apiData
}
