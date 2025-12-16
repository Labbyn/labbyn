import { ArrowUpDown, Plus, Trash2 } from 'lucide-react'
import { DataTable } from './ui/data-table'
import type { ColumnDef } from '@tanstack/react-table'
import type { Document } from '@/types/types'

import { Button } from '@/components/ui/button'

interface DocumentListProps {
  documents: Array<Document>
  selectedDoc: Document | null
  onSelectDocument: (doc: Document) => void
  onCreateDocument: () => void
  onDeleteDocument: (docId: string) => void
}

export function DocumentList({
  documents,
  selectedDoc,
  onSelectDocument,
  onCreateDocument,
  onDeleteDocument,
}: DocumentListProps) {
  const columns: Array<ColumnDef<Document>> = [
    {
      accessorKey: 'name',
      header: ({ column }) => {
        return (
          <Button
            variant="link"
            className="has-[>svg]:px-0"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Name
            <ArrowUpDown className="ml-1 h-3 w-3" />
          </Button>
        )
      },
      cell: ({ row }) => (
        <div className="font-medium truncate max-w-[150px]">
          {row.getValue('name')}
        </div>
      ),
    },
    {
      accessorKey: 'createdBy',
      header: ({ column }) => {
        return (
          <Button
            variant="link"
            className="has-[>svg]:px-0"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Author
            <ArrowUpDown className="ml-1 h-3 w-3" />
          </Button>
        )
      },
      cell: ({ row }) => (
        <div className="text-muted-foreground truncate max-w-[100px]">
          {row.getValue('createdBy')}
        </div>
      ),
    },
    {
      accessorKey: 'updatedAt',
      header: ({ column }) => {
        return (
          <Button
            variant="link"
            className="has-[>svg]:px-0"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Updated
            <ArrowUpDown className="ml-1 h-3 w-3" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const date = new Date(row.getValue('updatedAt'))
        return (
          <div className="text-xs text-muted-foreground whitespace-nowrap">
            {date.toLocaleDateString()}
          </div>
        )
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation()
              onDeleteDocument(row.original.id)
            }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <DataTable
      data={documents}
      columns={columns}
      onRowClick={onSelectDocument}
      selectedId={selectedDoc?.id}
      actionElement={
        <Button onClick={onCreateDocument} className="w-full">
          <Plus className="mr-2 h-4 w-4" />
          New Document
        </Button>
      }
    />
  )
}
