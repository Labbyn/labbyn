export type EntityType =
  | 'machines'
  | 'inventory'
  | 'room'
  | 'user'
  | 'categories'
export type ActionType = 'create' | 'update' | 'delete'

export interface ApiHistoryItem {
  id: number
  entity_type: EntityType
  action: ActionType
  entity_id: number
  user_id: number | null
  before_state: Record<string, any> | null
  after_state: Record<string, any> | null
  can_rollback: boolean
  extra_data: Record<string, any> | null
  timestamp: string
  entity_name: string | null
  user: {
    login: string
  } | null
}

export type ApiHistoryResponse = Array<ApiHistoryItem>
