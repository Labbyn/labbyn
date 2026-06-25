export type ImportEntityType = 'machines' | 'racks' | 'inventory'

export interface ApiImportPayload {
  ui_team_id: number
  rows: Array<Record<string, any>>
}

export interface ImportResponseDetail {
  row: number
  name: string
  status: 'success' | 'failed'
  error?: string
}

export interface ImportReportResponse {
  summary: {
    total: number
    success: number
    failed: number
  }
  details: Array<ImportResponseDetail>
}

export type ApiImportResponse = string
