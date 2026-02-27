import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Users } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import type { ApiTeamInfo } from '@/integrations/teams/teams.types'
import { DataTable } from '@/components/ui/data-table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { DataTableColumnHeader } from '@/components/data-table/column-header'
import { teamsInfoQueryOptions } from '@/integrations/teams/teams.query'
import { PageHeader } from '@/components/page-header'

export const Route = createFileRoute('/_auth/teams/')({
  component: RouteComponent,
})

export const columns: Array<ColumnDef<ApiTeamInfo>> = [
  {
    accessorKey: 'name',
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Group name" />
    },
    cell: ({ row }) => <span>{row.getValue('name')}</span>,
  },
  {
    accessorKey: 'admins',
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Administrator" />
    },
    cell: ({ row }) => {
      const admins = row.getValue<Array<any>>('admins')

      if (!admins.length)
        return <span className="text-muted-foreground">-</span>

      return (
        <div className="flex gap-1 flex-wrap">
          {admins.map((admin, index) => (
            <span key={index}>{admin.full_name}</span>
          ))}
        </div>
      )
    },
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
  const { data: teams } = useSuspenseQuery(teamsInfoQueryOptions)
  const navigate = Route.useNavigate()

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Teams" description="Groups and members" icon={Users} />
      <ScrollArea className="h-full">
        <div className="p-6">
          <DataTable
            columns={columns}
            data={teams}
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
