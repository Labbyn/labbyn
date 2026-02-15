export type ApiDocumentationItem = {
  id: number
  nane: string
  color: string
  version_id: number | null
}

export type AiDocumentationResponse = Array<ApiDocumentationItem>
