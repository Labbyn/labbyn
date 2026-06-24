import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import type {
  ApiCategoryItem,
  ApiCategoryUpdate,
} from '@/integrations/category/category.types'
import { DataTable } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { GenericCreateDialog } from '@/components/generic-create-dialog'
import { DataTableColumnHeader } from '@/components/data-table/column-header'
import { DataTableRowActions } from '@/components/data-table/row-actions'
import { categoryListQueryOptions } from '@/integrations/category/category.query'
import {
  useDeletCategoryMutation,
  useUpdateCategoryMutation,
} from '@/integrations/category/category.mutation'
import { AddCategoriesDialog } from '@/components/add-categories-dialog'

const formatHeader = (key: string) =>
  key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())

export const columns: Array<ColumnDef<ApiCategoryItem>> = [
  ...(['id', 'name'] as Array<keyof ApiCategoryItem>).map((key) => ({
    accessorKey: key,
    header: ({ column }: any) => (
      <DataTableColumnHeader
        column={column}
        title={formatHeader(key as string)}
      />
    ),
    cell: ({ getValue }: { getValue: () => any }) => getValue() ?? '-',
  })),
  {
    id: 'actions',
    meta: {
      headerClassName: 'sticky right-0 z-20',
      cellClassName: 'sticky right-0 z-10',
    },
    cell: ({ row, table }) => {
      const category = row.original
      const deleteCategory = useDeletCategoryMutation(category.id)
      const meta = table.options.meta as any
      return (
        <DataTableRowActions
          row={category}
          idBadge={category.id}
          actions={[
            {
              label: 'Edit',
              onClick: () => meta?.onEdit?.(category),
            },
            {
              label: 'Delete',
              isDestructive: true,
              onClick: () => deleteCategory.mutate(),
            },
          ]}
        />
      )
    },
  },
]

export default function CategoriesAdminPanel() {
  const { data: categories = [] } = useQuery(categoryListQueryOptions)
  const [editingCategory, setEditingCategory] =
    useState<ApiCategoryItem | null>(null)

  const fieldsConfig = {
    name: { type: 'text' as const },
  }

  const updateCategory = useUpdateCategoryMutation(editingCategory?.id || 0)

  const handleEditCategory = (data: ApiCategoryUpdate) => {
    if (!editingCategory) return
    updateCategory.mutate(
      { name: data.name },
      { onSuccess: () => setEditingCategory(null) },
    )
  }

  return (
    <>
      <DataTable
        columns={columns}
        data={categories}
        meta={{ onEdit: setEditingCategory }}
        actionElement={
          <>
            <AddCategoriesDialog>
              <Button>Add Category</Button>
            </AddCategoriesDialog>
          </>
        }
      />

      {editingCategory && (
        <GenericCreateDialog
          title="Edit Category"
          isOpen={!!editingCategory}
          onClose={() => setEditingCategory(null)}
          defaultValues={{ name: editingCategory.name }}
          fieldsConfig={fieldsConfig}
          onSubmit={handleEditCategory}
        />
      )}
    </>
  )
}
