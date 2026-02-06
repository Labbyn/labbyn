import type { ApiTeamItem } from './teams.types'

export type ApiTeamResponse = Array<ApiTeamItem>

export function fetchTeamsData(apiData: ApiTeamResponse) {
  return apiData
}

export function fetchTeamData(apiData: ApiTeamItem) {
  return apiData
}
