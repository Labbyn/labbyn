export type ImportEntityType = 'machines' | 'racks' | 'inventory'

export interface ApiImportPayload {
  ui_team_id: number
  rows: Array<Record<string, any>>
}

export type ApiImportResponse = string
