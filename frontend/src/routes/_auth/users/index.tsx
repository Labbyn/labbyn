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
  },
  {
    accessorKey: 'surname',
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Surname" />
    },
  },
  {
    accessorKey: 'user_type',
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="User type" />
    },
    cell: ({ getValue }) => {
      const value = getValue()

      if (typeof value !== 'string') return null

      return (
        <span>
          {value.charAt(0).toUpperCase() +
            value.slice(1).toLowerCase().replace('_', ' ')}
        </span>
      )
    },
  },
  {
    id: 'membership',
    accessorFn: (row) => row.membership.map((g) => g.team_name).join(', '),
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Teams" />
    },
    cell: ({ getValue }) => {
      return <span>{getValue() as string}</span>
    },
  },
]

function RouteComponent() {
  const { data: users } = useSuspenseQuery(usersQueryOptions)
  const navigate = Route.useNavigate()

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Users"
        description="Browse lab members and their team affiliations"
        icon={User}
      />
      <ScrollArea className="h-full">
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
      </ScrollArea>
    </div>
  )
}
