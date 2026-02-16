import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import type { ApiUserInfo, ApiUserItem } from '@/integrations/user/user.types'
import { DataTable } from '@/components/ui/data-table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { DataTableColumnHeader } from '@/components/data-table/column-header'
import { teamsQueryOptions } from '@/integrations/teams/teams.query'

export const Route = createFileRoute('/_auth/teams/')({
  component: RouteComponent,
})

export const columns: Array<ColumnDef<ApiUserInfo>> = [
  {
    accessorKey: 'name',
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Group name" />
    },
    cell: ({ row }) => <span>{row.getValue('name')}</span>,
  },
  {
    accessorKey: 'admin',
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Administrator" />
    },
    cell: ({ row }) => <span>{row.original.team_admin_name}</span>,
  },
  {
    accessorKey: 'memberCount',
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Members" />
    },
    cell: ({ row }) => <span>{row.original.member_count}</span>,
  },
]

function RouteComponent() {
  const { data: users } = useSuspenseQuery(teamsQueryOptions)
  const navigate = Route.useNavigate()

  return (
    <div className="h-screen w-full z-1 overflow-hidden">
      <ScrollArea className="h-full">
        <div className="p-6">
          <DataTable
            columns={columns}
            data={users}
            onRowClick={(row) => {
              navigate({
                to: '/teams/$teamId',
                params: { teamId: String(row.id) },
              })
            }}
          />
        </div>
      </ScrollArea>
    </div>
  )
}
