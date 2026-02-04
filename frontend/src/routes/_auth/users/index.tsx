import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import type { ApiUserItem } from '@/integrations/user/user.types'
import { DataTable } from '@/components/ui/data-table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { PageIsLoading } from '@/components/page-is-loading'
import { DataTableColumnHeader } from '@/components/data-table/column-header'
import { userQueryOptions } from '@/integrations/user/user.query'

export const Route = createFileRoute('/_auth/users/')({
  component: RouteComponent,
})

export const columns: Array<ColumnDef<ApiUserItem>> = [
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
    accessorKey: 'team_id',
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Team ID" />
    },
  },
  {
    accessorKey: 'user_type',
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="User type" />
    },
  },
]

function RouteComponent() {
  const { data: users = [], isLoading } = useQuery(userQueryOptions)
  const navigate = Route.useNavigate()

  if (isLoading) return <PageIsLoading />

  return (
    <div className="h-screen w-full z-1 overflow-hidden">
      <ScrollArea className="h-full">
        <div className="p-6">
          <DataTable
            columns={columns}
            data={users}
            onRowClick={(row) => {
              navigate({
                to: '/users/$userId',
                params: { userId: String(row.id) },
              })
            }}
          />
        </div>
      </ScrollArea>
    </div>
  )
}
