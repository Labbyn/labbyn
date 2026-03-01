import { Plus, X } from 'lucide-react'
import { AssignTagDialog } from './assign-tag-dialog'
import type { ApiTagsResponse } from '@/integrations/tags/tags.types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export const colorMap = {
  red: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
  purple:
    'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  lightBlue: 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  green: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300',
  blue: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
}

export function TagList({ tags, type }: ApiTagsResponse) {
  const isEditing = type === 'edit'

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {(!tags || tags.length === 0) && (
        <span className="text-sm text-muted-foreground">No tags</span>
      )}

      {tags?.map((tag) => (
        <Badge key={tag.id} className={colorMap[tag.color]}>
          {tag.name}
          {isEditing && <X className="ml-1 h-3 w-3" />}
        </Badge>
      ))}

      {isEditing && (
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <AssignTagDialog />
        </Button>
      )}
    </div>
  )
}
