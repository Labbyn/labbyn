export type ApiTeamItem = {
  id: number
  name: string
  team_admin_id: number | null
  version_id: number | null
}

export type ApiTeamResponse = Array<ApiTeamItem>
