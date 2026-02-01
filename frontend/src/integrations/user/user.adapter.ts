import type { ApiUserItem } from './user.types'

export type ApiUserResponse = Array<ApiUserItem>

export function fetchUserData(apiData: ApiUserResponse) {
  return apiData
}
