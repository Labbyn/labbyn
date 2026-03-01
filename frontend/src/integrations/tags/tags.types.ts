export type ApiTagsItem = {
  id: number
  name: string
  color: string
  version_id: number | null
}

export interface TagItem {
  id: number
  name: string
  color: TagColor
}

export type ApiTagsResponse = Array<ApiTagsItem>
