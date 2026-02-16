import type { ApiTeamItem } from '../teams/teams.types'

export type UserType = 'admin' | 'group_admin' | 'user'

export interface UserRead {
  id: number
  email: string
  name: string
  surname: string
  login: string
  team_id: number | null
  user_type: UserType
  is_active: boolean
  is_superuser: boolean
  is_verified: boolean
  force_password_change: boolean
  version_id: number
}

export interface UserCreatedResponse extends UserRead {
  generated_password: string | null
}

export type UserCreate = {
  email: string
  name: string
  surname: string
  login: string
  password?: string | null
  is_active?: boolean | null
  is_superuser?: boolean | null
  is_verified?: boolean | null
  team_id?: number | null
  user_type?: UserType
}

export type UserUpdate = Partial<UserCreate>

export type ApiUserItem = UserRead
export type ApiUserResponse = Array<UserRead>

export type ApiUserInfo = {
  name: string
  surname: string
  login: string
  user_type: UserType
  assigned_groups: Array<ApiTeamItem>
}

export type ApiUsersInfoRespnse = Array<ApiUserInfo>
