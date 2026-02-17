import type { UserType } from '../user/user.types'

export type ApiTeamItem = {
  id: number
  name: string
  team_admin_id: number | null
  version_id: number | null
}

export type ApiTeamResponse = Array<ApiTeamItem>

export type ApiTeamMemberInfo = {
  id: number
  full_name: string
  login: string
  email: string
  user_type: UserType
  user_link: string
}

export type ApiTeamRackInfo = {
  name: string
  team_name: string
  map_link: string
  tags: Array<string>
  machines_count: number
}

export type ApiTeamInfo = {
  id: number
  name: string
  team_admin_name: string
  admin: {
    full_name: string
    login: string
    email: string
  }
  members: Array<ApiTeamMemberInfo>
  member_count: number
  racks: Array<ApiTeamRackInfo>
  machines: Array<any>
  inventory: Array<any>
}

export type ApiTeamInfoResponse = Array<ApiTeamInfo>
