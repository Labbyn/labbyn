export type ApiDocumentationItem = {
  id: number
  title: string
  content: string
  added_on: string // format: date-time
  modified_on: string | null // format: date-time
  version_id: number | null
}

export type AiDocumentationResponse = Array<ApiDocumentationItem>
