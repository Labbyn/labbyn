import type { colorMap } from '@/components/tag-list'

export type ApiTagsItem = {
  id: number
  name: string
  color: string
  version_id: number | null
}

export type TagColor = keyof typeof colorMap

export interface TagItem {
  id: number
  name: string
  color: TagColor
}

export interface AssignDetachTagForm {
  tag_ids: Array<string>
  entity_id: string
  entity_type: string
}

export type ApiTagsResponse = Array<ApiTagsItem>
