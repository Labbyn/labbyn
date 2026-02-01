export type ApiUserItem = {
  id: number
  name: string
  surname: string
  team_id: number | null
  login: string
  email: string
  hashed_password: string
  is_active: boolean | number
  is_superuser: boolean | number
  is_verified: boolean | number
  user_type: 'ADMIN' | 'GROUP_ADMIN' | 'USER'
  force_password_change: boolean | number
  version_id: number
}

export type ApiUserResponse = Array<ApiUserItem>
