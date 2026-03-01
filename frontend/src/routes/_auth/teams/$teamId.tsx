import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Box, Cpu, Server, Users } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import { singleTeamInfoQueryOptions } from '@/integrations/teams/teams.query'
import { DataTable } from '@/components/ui/data-table'
import { DataTableColumnHeader } from '@/components/data-table/column-header'
import { Separator } from '@/components/ui/separator'
import { TagList } from '@/components/tag-list'
import { SubPageTemplate } from '@/components/subpage-template'
import { SubpageCard } from '@/components/subpage-card'

export const Route = createFileRoute('/_auth/teams/$teamId')({
  component: TeamsDetailsPage,
})

// TODO: Add admin operations
function TeamsDetailsPage() {
  const router = useRouter()
  const { teamId } = Route.useParams()
  const { data: team } = useSuspenseQuery(singleTeamInfoQueryOptions(teamId))
  const navigate = Route.useNavigate()

  const columnsUsers: Array<ColumnDef<any>> = [
    {
      accessorKey: 'full_name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Full Name" />
      ),
    },
    {
      accessorKey: 'login',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Login" />
      ),
    },
    {
      accessorKey: 'user_type',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="User type" />
      ),
    },
  ]

  const columnsRacks: Array<ColumnDef<any>> = [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Rack Name" />
      ),
    },
    {
      accessorKey: 'machines',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Machines" />
      ),
      cell: ({ row }) => {
        return <span>{row.original.machines_count}</span>
      },
    },
    {
      accessorKey: 'tags',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Tags" />
      ),
      cell: ({ row }) => {
        const tags = row.getValue<Array<string>>('tags')
        return <TagList tags={tags} />
      },
    },
  ]

  const columnsMachines: Array<ColumnDef<any>> = [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Machine Name" />
      ),
    },
    {
      accessorKey: 'ip_address',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="IP address" />
      ),
    },
    {
      accessorKey: 'mac_address',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="MAC address" />
      ),
    },
    {
      accessorKey: 'tags',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Tags" />
      ),
      cell: ({ row }) => {
        const tags = row.getValue<Array<string>>('tags')
        return <TagList tags={tags} />
      },
    },
  ]

  const columnsInventory: Array<ColumnDef<any>> = [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Item Name" />
      ),
    },
    {
      accessorKey: 'quantity',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Quantity" />
      ),
    },
    {
      accessorKey: 'category_name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Category" />
      ),
    },
    {
      accessorKey: 'machine_info',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Assigned machine" />
      ),
    },
  ]

  return (
    <SubPageTemplate
      headerProps={{
        title: team.name,
      }}
      content={
        <>
          {/* Users Section */}
          <SubpageCard
            title={'Team Members'}
            description={'Team members desc'}
            type="table"
            Icon={Users}
            content={
              <>
                {' '}
                <DataTable
                  columns={columnsUsers}
                  data={team.members}
                  onRowClick={(row) => {
                    navigate({
                      to: '/users/$userId',
                      params: { userId: String(row.id) },
                    })
                  }}
                />
              </>
            }
          />
          {/* Racks Section */}
          <SubpageCard
            title={'Racks'}
            description={'Racks description'}
            type="table"
            Icon={Server}
            content={
              <>
                <DataTable
                  columns={columnsRacks}
                  data={team.racks}
                  onRowClick={(row) => {
                    navigate({
                      to: '/racks/$rackId',
                      params: { rackId: String(row.id) },
                    })
                  }}
                />
              </>
            }
          />
          {/* Machines Section */}
          <SubpageCard
            title={'Machines & Platforms'}
            description={'Machines & Platforms description'}
            type="table"
            Icon={Cpu}
            content={
              <>
                <DataTable
                  columns={columnsMachines}
                  data={team.machines}
                  onRowClick={(row) => {
                    navigate({
                      to: '/machines/$machineId',
                      params: { machineId: String(row.id) },
                    })
                  }}
                />
              </>
            }
          />
          {/* Inventory Section */}
          <SubpageCard
            title={'Inventory items'}
            description={'Inventory items description'}
            type="table"
            Icon={Box}
            content={
              <>
                <DataTable
                  columns={columnsInventory}
                  data={team.inventory}
                  onRowClick={(row) => {
                    navigate({
                      to: '/inventory/$invnetoryId',
                      params: { invnetoryId: String(row.id) },
                    })
                  }}
                />
              </>
            }
          />
        </>
      }
    />
  )
}
