import { Link, createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import type { fetchInventoryData } from '@/integrations/inventory/inventory.adapter'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { PageIsLoading } from '@/components/page-is-loading'
import { inventoryQueryOptions } from '@/integrations/inventory/inventory.query'
import { DataTableColumnHeader } from '@/components/data-table/column-header'

export const Route = createFileRoute('/_auth/inventory/')({
  component: RouteComponent,
})

type InventoryItem = ReturnType<typeof fetchInventoryData>[number]

export const columns: Array<ColumnDef<InventoryItem>> = [
  {
    accessorKey: 'id',
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="ID" />
    },
    cell: ({ row }) => (
      <div className="flex flex-col">{row.getValue('id') || '-'}</div>
    ),
  },
  {
    accessorKey: 'name',
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Name" />
    },
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium">{row.getValue('name')}</span>
      </div>
    ),
  },
  {
    accessorKey: 'quantity',
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Quantity" />
    },
    cell: ({ row }) => (
      <div className="flex flex-col gap-1 items-center justify-center text-center">
        <Badge variant="outline" className="w-fit">
          {row.getValue('quantity')}
        </Badge>
      </div>
    ),
  },
  {
    accessorKey: 'teamId',
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Team ID" />
    },
    cell: ({ row }) => (
      <div className="flex flex-col items-center justify-center text-center">
        <span className="font-medium">{row.getValue('teamId') || '-'} </span>
      </div>
    ),
  },
  {
    accessorKey: 'localizationId',
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Quantity" />
    },
    cell: ({ row }) => (
      <div className="flex flex-col items-center justify-center text-center">
        <span className="font-medium">
          {row.getValue('localizationId') || '-'}{' '}
        </span>
      </div>
    ),
  },
  {
    accessorKey: 'machineId',
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Machine ID" />
    },
    cell: ({ row }) => {
      const value = row.getValue('machineId')
      return (
        <div className="flex flex-col items-center justify-center text-center">
          <span className="font-medium">{(value as number | null) ?? '-'}</span>
        </div>
      )
    },
  },
  {
    accessorKey: 'categoryId',
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Category ID" />
    },
    cell: ({ row }) => (
      <div className="flex flex-col items-center justify-center text-center">
        {row.getValue('categoryId') || '-'}
      </div>
    ),
  },
  {
    accessorKey: 'rentalStatus',
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Rental Status" />
    },
    cell: ({ row }) => (
      <div className="flex flex-col items-center justify-center text-center">
        {row.getValue('rentalStatus') || '-'}
      </div>
    ),
  },
  {
    accessorKey: 'rentalId',
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Rental ID" />
    },
    cell: ({ row }) => (
      <div className="flex flex-col items-center justify-center text-center">
        {row.getValue('rentalId') || '-'}
      </div>
    ),
  },
  {
    accessorKey: 'versionId',
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Version ID" />
    },
    cell: ({ row }) => (
      <div className="flex flex-col items-center justify-center text-center">
        {row.getValue('versionId') || '-'}
      </div>
    ),
  },
]

function RouteComponent() {
  const { data: inventory = [], isLoading } = useQuery(inventoryQueryOptions)

  if (isLoading) return <PageIsLoading />

  return (
    <div className="h-screen w-full z-1 overflow-hidden">
      <ScrollArea className="h-full">
        <div className="p-6">
          <DataTable
            columns={columns}
            data={inventory}
            actionElement={
              <Button>
                <Link to="/add-items">Add items</Link>
              </Button>
            }
          />
        </div>
      </ScrollArea>
    </div>
  )
}
