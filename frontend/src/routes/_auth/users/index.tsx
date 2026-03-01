import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { User } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import type { ApiUserInfo } from '@/integrations/user/user.types'
import { DataTable } from '@/components/ui/data-table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { DataTableColumnHeader } from '@/components/data-table/column-header'
import { usersQueryOptions } from '@/integrations/user/user.query'
import { PageHeader } from '@/components/page-header'

export const Route = createFileRoute('/_auth/users/')({
  component: RouteComponent,
})

export const columns: Array<ColumnDef<ApiUserInfo>> = [
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
    accessorKey: 'surname',
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Surname" />
    },
    cell: ({ row }) => (
      <span>
        {row.getValue('surname')} {row.original.surname}
      </span>
    ),
  },
  {
    accessorKey: 'login',
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Login" />
    },
    cell: ({ row }) => (
      <span>
        {row.getValue('login')} {row.original.surname}
      </span>
    ),
  },
  {
    accessorKey: 'user_type',
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="User type" />
    },
  },
  {
    accessorKey: 'membership',
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Teams" />
    },
    cell: ({ row }) => {
      const groupNames = row.original.membership
        .map((g) => g.team_name)
        .join(', ')

      return <span>{groupNames}</span>
    },
  },
]

function RouteComponent() {
  const { data: users } = useSuspenseQuery(usersQueryOptions)
  const navigate = Route.useNavigate()

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Users" description="Users description" icon={User} />
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
