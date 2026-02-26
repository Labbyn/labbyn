export type ApiTagsItem = {
  id: number
  name: string
  color: string
  version_id: number | null
}

export type ApiTagsResponse = Array<ApiTagsItem>
