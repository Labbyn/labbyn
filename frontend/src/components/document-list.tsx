import { BookText, Plus, Trash2  } from 'lucide-react'
import { DataTable } from './ui/data-table'
import { DataTableColumnHeader } from './data-table/column-header'
import type { ColumnDef } from '@tanstack/react-table'
import type { Document } from '@/types/types'
import { PageHeader } from '@/components/page-header'
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
      accessorKey: 'title',
      header: ({ column }) => {
        return <DataTableColumnHeader column={column} title="Title" />
      },
      cell: ({ row }) => (
        <div className="font-medium truncate max-w-37.5">
          {row.getValue('title')}
        </div>
      ),
    },
    {
      accessorKey: 'author',
      header: ({ column }) => {
        return <DataTableColumnHeader column={column} title="Author" />
      },
      cell: ({ row }) => (
        <div className="text-muted-foreground truncate max-w-25">
          {row.getValue('author')}
        </div>
      ),
    },
    {
      accessorKey: 'modified_on',
      header: ({ column }) => {
        return <DataTableColumnHeader column={column} title="Last Updated" />
      },
      cell: ({ row }) => {
        const dateValue = row.original.modified_on || row.original.added_on
        const date = new Date(dateValue)
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
              onDeleteDocument(String(row.original.id))
            }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Documentation"
        description="Notes, scripts, instructions..."
        icon={BookText}
      />
      <DataTable
        data={documents}
        columns={columns}
        onRowClick={onSelectDocument}
        selectedId={selectedDoc?.id.toString()}
        actionElement={
          <Button onClick={onCreateDocument} variant={'outline'}>
            <Plus className="mr-2 h-4 w-4" />
            Create new document
          </Button>
        }
      />
    </div>
  )
}
