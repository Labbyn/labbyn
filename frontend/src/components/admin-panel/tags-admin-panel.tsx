import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import type { ApiTagsItem } from '@/integrations/tags/tags.types'
import { DataTable } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { DataTableColumnHeader } from '@/components/data-table/column-header'
import { DataTableRowActions } from '@/components/data-table/row-actions'
import { Badge } from '@/components/ui/badge'
import { tagsQueryOptions } from '@/integrations/tags/tags.query'
import { useDeletTagMutation } from '@/integrations/tags/tags.mutation'
import { colorMap } from '@/components/tag-list'
import { AddTagDialog } from '@/components/add-tag-dialog'
import { EditTagDialog } from '@/components/edit-tag-dialog'

const formatHeader = (key: string) =>
  key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())

export const columns: Array<ColumnDef<ApiTagsItem>> = [
  ...(['id', 'name', 'color'] as Array<keyof ApiTagsItem>).map((key) => ({
    accessorKey: key,
    header: ({ column }: any) => (
      <DataTableColumnHeader
        column={column}
        title={formatHeader(key as string)}
      />
    ),
    cell:
      key === 'color'
        ? ({ getValue }: { getValue: () => any }) => {
            const value = getValue()
            const className = (value && (colorMap as any)[value]) || ''
            const label = value
              ? String(value)
                  .replace(/([A-Z])/g, ' $1')
                  .replace(/_/g, ' ')
                  .replace(/^./, (s) => s.toUpperCase())
              : '-'
            return (
              <div>
                <Badge className={className}>{label}</Badge>
              </div>
            )
          }
        : ({ getValue }: { getValue: () => any }) => getValue() ?? '-',
  })),

  {
    id: 'actions',
    meta: {
      headerClassName: 'sticky right-0 z-20',
      cellClassName: 'sticky right-0 z-10',
    },
    cell: ({ row, table }) => {
      const tag = row.original
      const deleteTag = useDeletTagMutation(tag.id)
      const meta = table.options.meta as any
      return (
        <DataTableRowActions
          row={tag}
          idBadge={tag.id}
          actions={[
            {
              label: 'Edit',
              onClick: () => meta?.onEdit?.(tag),
            },
            {
              label: 'Delete',
              isDestructive: true,
              onClick: () => deleteTag.mutate(),
            },
          ]}
        />
      )
    },
  },
]

export default function TagsAdminPanel() {
  const { data: tags = [] } = useQuery(tagsQueryOptions)
  const [editingTag, setEditingTag] = useState<ApiTagsItem | null>(null)

  return (
    <>
      <DataTable
        columns={columns}
        data={tags}
        meta={{ onEdit: setEditingTag }}
        actionElement={
          <>
            <AddTagDialog>
              <Button>Add Tag</Button>
            </AddTagDialog>
          </>
        }
      />

      {editingTag && (
        <EditTagDialog
          tag={editingTag}
          isOpen={!!editingTag}
          onClose={() => setEditingTag(null)}
        />
      )}
    </>
  )
}
