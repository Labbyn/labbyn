import { createFileRoute } from '@tanstack/react-router'
import { ArrowUpDown } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { machines } from '@/lib/mock-data'
import { PageIsLoading } from '@/components/page-is-loading'

export const Route = createFileRoute('/_auth/inventory/')({
  component: RouteComponent,
})

export type Machine = (typeof machines)[0]

const fetchMachines = async (): Promise<Array<Machine>> => {
  // Symulacja opóźnienia sieciowego (500ms)
  await new Promise((resolve) => setTimeout(resolve, 500))
  return machines
}

export const columns: Array<ColumnDef<Machine>> = [
  {
    accessorKey: 'name',
    header: ({ column }) => {
      return (
        <Button
          variant="link"
          className="has-[>svg]:px-0"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Name / Serial
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      )
    },
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium">{row.getValue('name')}</span>
        <span className="text-xs text-muted-foreground">
          {row.original.serialNumber}
        </span>
      </div>
    ),
  },
  {
    accessorKey: 'labName',
    header: ({ column }) => {
      return (
        <Button
          variant="link"
          className="has-[>svg]:px-0"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Lab & Team
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      )
    },
    cell: ({ row }) => (
      <div className="flex flex-col gap-1">
        <Badge variant="outline" className="w-fit">
          {row.getValue('labName')}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {row.original.teamName}
        </span>
      </div>
    ),
  },
  {
    accessorKey: 'macAddress',
    header: 'Network Info',
    cell: ({ row }) => (
      <div className="flex flex-col font-mono text-xs">
        <span>{row.getValue('macAddress')}</span>
        <span className="text-muted-foreground">
          Port: {row.original.pduPort}
        </span>
      </div>
    ),
  },
  {
    accessorKey: 'operatingSystem',
    header: 'OS',
  },
  {
    id: 'specs',
    header: 'Hardware Specs',
    cell: ({ row }) => (
      <div className="text-sm">
        <div className="font-medium">{row.original.cpu}</div>
        <div className="text-xs text-muted-foreground">
          {row.original.ram} | {row.original.disk}
        </div>
      </div>
    ),
  },
  {
    accessorKey: 'addedOn',
    header: ({ column }) => {
      return (
        <Button
          variant="link"
          className="has-[>svg]:px-0"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Date Added
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const date = new Date(row.getValue('addedOn'))
      return <div className="font-medium">{date.toLocaleDateString()}</div>
    },
  },
  {
    accessorKey: 'notes',
    header: 'Notes',
    cell: ({ row }) => (
      <div className="max-w-50 truncate text-muted-foreground italic">
        {row.getValue('notes') || '-'}
      </div>
    ),
  },
]

function RouteComponent() {
  const { data: machines = [], isLoading } = useQuery({
    queryKey: ['machines'],
    queryFn: fetchMachines,
  })

  if (isLoading) return <PageIsLoading />

  return (
    <div className="h-screen w-full z-1 overflow-hidden">
      <ScrollArea className="h-full">
        <div className="p-6">
          <DataTable columns={columns} data={machines} />
        </div>
      </ScrollArea>
    </div>
  )
}
