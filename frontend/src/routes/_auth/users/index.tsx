import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/data-table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { users } from '@/lib/mock-data'
import { PageIsLoading } from '@/components/page-is-loading'
import { DataTableColumnHeader } from '@/components/data-table/column-header'

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
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Id" />
    },
  },
  {
    accessorKey: 'name',
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Name" />
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
      return <DataTableColumnHeader column={column} title="Team" />
    },
  },
  {
    accessorKey: 'role',
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Role" />
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
