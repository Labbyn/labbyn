import type { ApiInventoryItem } from './inventory.types'

export type ApiInventoryResponse = ApiInventoryItem[];

export function fetchInventoryData(apiData: ApiInventoryResponse) {
  return apiData.map((row) => ({
    name: row.name,
    quantity: row.quantity,
    teamId: row.team_id,
    localizationId: row.localization_id,
    machineId: row.machine_id,
    categoryId: row.category_id,
    rentalStatus: row.rental_status,
    rentalId: row.rental_id,
    id: row.id,
    versionId: row.version_id,
    }));
}
