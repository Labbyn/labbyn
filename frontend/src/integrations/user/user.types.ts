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
  id: number
  name: string
  surname: string
  login: string
  user_type: UserType
  membership: Array<ApiUserInfoMembership>
  avatar_url: string
  email: string
  group_links: Array<string>
}

export type ApiUserInfoMembership = {
  team_id: number
  team_name: string
  is_group_admin: boolean
}

export type ApiUsersInfoRespnse = Array<ApiUserInfo>
