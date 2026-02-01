import type { ApiMachineItem } from './machines.types'

export type ApiMachineResponse = Array<ApiMachineItem>

export function fetchMachinesData(apiData: ApiMachineResponse) {
  return apiData
}
