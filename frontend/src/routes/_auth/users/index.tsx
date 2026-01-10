import { createFileRoute } from '@tanstack/react-router'
import { ArrowUpDown } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { users } from '@/lib/mock-data'
import { PageIsLoading } from '@/components/page-is-loading'

export const Route = createFileRoute('/_auth/users/')({
  component: RouteComponent,
})

export type User = (typeof users)[0]

const fetchUsers = async (): Promise<Array<User>> => {
  // Symulacja API
  await new Promise((resolve) => setTimeout(resolve, 500))
  return users
}

export const columns: Array<ColumnDef<User>> = [
  {
    accessorKey: 'id',
    header: 'ID',
  },
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
      <span>
        {row.getValue('name')} {row.original.surname}
      </span>
    ),
  },
  {
    accessorKey: 'team',
    header: ({ column }) => {
      return (
        <Button
          variant="link"
          className="has-[>svg]:px-0"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Team Name
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      )
    },
  },
  {
    accessorKey: 'role',
    header: ({ column }) => {
      return (
        <Button
          variant="link"
          className="has-[>svg]:px-0"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Role
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      )
    },
  },
]

function RouteComponent() {
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  })

  if (isLoading) return <PageIsLoading />

  return (
    <div className="h-screen w-full z-1 overflow-hidden">
      <ScrollArea className="h-full">
        <div className="p-6">
          <DataTable columns={columns} data={users} />
        </div>
      </ScrollArea>
    </div>
  )
}
