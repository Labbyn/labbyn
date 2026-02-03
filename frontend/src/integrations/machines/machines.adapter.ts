import type { ApiMachineItem } from './machines.types'

export type ApiMachineResponse = Array<ApiMachineItem>

// fetch machines list
export function fetchMachinesData(apiData: ApiMachineResponse) {
  return apiData
}

// fetch single item from machine list
export function fetchMachineData(apiData: ApiMachineItem) {
  return apiData
}