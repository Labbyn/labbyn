import { useQuery } from '@tanstack/react-query'
import { Badge, MoreHorizontal } from 'lucide-react'
import { DataTable } from '../ui/data-table'
import { PageIsLoading } from '../page-is-loading'
import { Button } from '../ui/button'
import { DataTableColumnHeader } from '../data-table/column-header'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import type { ColumnDef } from '@tanstack/react-table'
import type { fetchInventoryData } from '@/integrations/inventory/inventory.adapter'
import { formatHeader } from '@/lib/utils'
import { inventoryQueryOptions } from '@/integrations/inventory/inventory.query'

type InventoryItem = ReturnType<typeof fetchInventoryData>[number]

export const columns: Array<ColumnDef<InventoryItem>> = [
  ...(
    [
      'id',
      'name',
      'quantity',
      'rental_status',
      'team_id',
      'localization_id',
      'machine_id',
      'category_id',
      'rental_id',
      'version_id',
    ] as Array<keyof InventoryItem>
  ).map((key) => ({
    accessorKey: key,
    header: ({ column }: any) => (
      <DataTableColumnHeader
        column={column}
        title={formatHeader(key as string)}
      />
    ),
    cell: ({ getValue }: { getValue: () => any }) => {
      const value = getValue()

      if (typeof value === 'boolean') {
        return (
          <Badge
            className={
              value
                ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'
                : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
            }
          >
            {value ? 'YES' : 'NO'}
          </Badge>
        )
      }

      return value ?? '-'
    },
  })),
  {
    id: 'actions',
    cell: ({ row }) => {
      const inventory = row.original

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => console.log('Edit item', inventory)}
            >
              Edit item
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]

export default function InventoryAdminPanel() {
  const { data: inventory = [], isLoading } = useQuery(inventoryQueryOptions)

  if (isLoading) return <PageIsLoading />

  return <DataTable columns={columns} data={inventory} />
}
