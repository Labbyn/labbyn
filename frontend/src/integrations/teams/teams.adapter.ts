import type { ApiTeamItem } from './teams.types'

export type ApiTeamResponse = Array<ApiTeamItem>

export function fetchTeamData(apiData: ApiTeamResponse) {
  return apiData
}
