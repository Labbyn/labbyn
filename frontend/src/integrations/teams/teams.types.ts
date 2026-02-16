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

export type ApiTeamInfo = {
  id: number
  name: string
  team_admin_name: string
  admin_details: Array<Any>
  members: Array<ApiTeamMemberInfo>
  member_count: number
}

export type ApiTeamInfoResponse = Array<ApiTeamInfo>
