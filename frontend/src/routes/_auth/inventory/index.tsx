import { Link, createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Package } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import type { fetchInventoryData } from '@/integrations/inventory/inventory.adapter'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { PageIsLoading } from '@/components/page-is-loading'
import { inventoryInfoQueryOptions } from '@/integrations/inventory/inventory.query'
import { DataTableColumnHeader } from '@/components/data-table/column-header'
import { PageHeader } from '@/components/page-header'
import type { ApiInventoryInfoResponse } from '@/integrations/inventory/inventory.types'


export const Route = createFileRoute('/_auth/inventory/')({
  component: RouteComponent,
})

export const columns: Array<ColumnDef<ApiInventoryInfoResponse>> = [
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
    accessorKey: 'total_quantity',
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Quantity" />
    },
    cell: ({ row }) => (
      <div className="flex flex-col gap-1 items-center justify-center text-center">
        <Badge variant="outline" className="w-fit">
          {row.getValue('total_quantity')}
        </Badge>
      </div>
    ),
  },
  {
    accessorKey: 'team_name',
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Team name" />
    },
    cell: ({ row }) => (
      <div className="flex flex-col items-center justify-center text-center">
        <span className="font-medium">{row.getValue('team_name') || '-'} </span>
      </div>
    ),
  },
  {
    accessorKey: 'machine_info',
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Assigned machine" />
    },
    cell: ({ row }) => (
      <div className="flex flex-col items-center justify-center text-center">
        <span className="font-medium">
          {row.getValue('machine_info') || '-'}
        </span>
      </div>
    ),
  },
  {
    accessorKey: 'category_name',
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Category name" />
    },
    cell: ({ row }) => {
      return (
        <div className="flex flex-col items-center justify-center text-center">
          <span className="font-medium">{row.getValue('machine_info') || '-'}</span>
        </div>
      )
    },
  },
  {
    accessorKey: 'room_name',
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Location name" />
    },
    cell: ({ row }) => (
      <div className="flex flex-col items-center justify-center text-center">
        {row.getValue('room_name') || '-'}
      </div>
    ),
  },
  {
     accessorKey: 'active_rentals',
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Active rentals" />
    },
    cell: ({ row }) => {
      const rentals = row.original.active_rentals;
      return (
      <div className="flex flex-col items-center justify-center gap-1 text-center">
        {rentals?.map((rent: string, index: number) => (
          <span key={index}>{rent}</span>
        ))}
        {!rentals?.length && <span className="text-muted-foreground">—</span>}
      </div>
    );
      }
    },
  {
     accessorKey: 'rental_actions',
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Rental actions" />
    },
    cell: ({ row }) => (
      <div className="flex flex-col items-center justify-center text-center">
        <Button>RENT PLACEHOLDER</Button>
      </div>
    ),
  },

]

function RouteComponent() {
  const { data: inventory = [], isLoading } = useQuery(inventoryInfoQueryOptions)
  const navigate = Route.useNavigate()

  if (isLoading) return <PageIsLoading />

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Inventory"
        description="Check where are your items or who is using them"
        icon={Package}
      />
      <ScrollArea className="h-full">
        <div className="p-6">
          <DataTable
            columns={columns}
            data={inventory}
            onRowClick={(row) => {
              navigate({
                to: '/inventory/$inventoryId',
                params: { inventoryId: String(row.id) },
              })
            }}
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
