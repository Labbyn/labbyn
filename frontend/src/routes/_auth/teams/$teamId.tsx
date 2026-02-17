import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { ArrowLeft, Box, Cpu, Server, Users } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import { singleTeamQueryOptions } from '@/integrations/teams/teams.query'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { DataTableColumnHeader } from '@/components/data-table/column-header'
import { Separator } from '@/components/ui/separator'

export const Route = createFileRoute('/_auth/teams/$teamId')({
  component: TeamsDetailsPage,
})

// TODO: Add admin operations
function TeamsDetailsPage() {
  const router = useRouter()
  const { teamId } = Route.useParams()
  const { data: team } = useSuspenseQuery(singleTeamQueryOptions(teamId))

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
    <div className="flex flex-col h-screen w-full overflow-hidden bg-background">
      <div className="flex items-center gap-4 bg-background/95 px-6 py-4 backdrop-blur z-10 shrink-0">
        <Button
          onClick={() => router.history.back()}
          variant="ghost"
          size="icon"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-bold tracking-tight">{team.name}</h1>
            <p className="text-muted-foreground text-sm">
              Team administrator: {team.admin.full_name}
            </p>
          </div>
        </div>
      </div>
      <Separator />
      <ScrollArea className="h-full bg-slate-50/50 dark:bg-zinc-950/50">
        <div className="p-8 max-w-[1600px] mx-auto space-y-8">
          {/* Main Content Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Users Section */}
            <section className="bg-card rounded-xl border shadow-sm flex flex-col overflow-hidden">
              <div className="px-6 py-4 border-b bg-muted/30 flex justify-between items-center">
                <h2 className="font-semibold text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" /> Team Members
                </h2>
                <span className="text-xs font-medium bg-primary/10 text-primary px-2.5 py-0.5 rounded-full">
                  {team.members.length} Total
                </span>
              </div>
              <div className="p-1">
                {' '}
                {/* Slight padding to prevent table borders overlapping card borders */}
                <DataTable columns={columnsUsers} data={team.members} />
              </div>
            </section>

            {/* Racks Section */}
            <section className="bg-card rounded-xl border shadow-sm flex flex-col overflow-hidden">
              <div className="px-6 py-4 border-b bg-muted/30 flex justify-between items-center">
                <h2 className="font-semibold text-lg flex items-center gap-2">
                  <Server className="h-5 w-5 text-primary" /> Racks
                  Configuration
                </h2>
                <span className="text-xs font-medium bg-primary/10 text-primary px-2.5 py-0.5 rounded-full">
                  {team.racks.length} Total
                </span>
              </div>
              <div className="p-1">
                <DataTable columns={columnsRacks} data={team.racks} />
              </div>
            </section>

            {/* Machines Section - Full Width for large tables */}
            <section className="lg:col-span-2 bg-card rounded-xl border shadow-sm flex flex-col overflow-hidden">
              <div className="px-6 py-4 border-b bg-muted/30 flex justify-between items-center">
                <h2 className="font-semibold text-lg flex items-center gap-2">
                  <Cpu className="h-5 w-5 text-primary" /> Machines & Platforms
                </h2>
                <span className="text-xs font-medium bg-primary/10 text-primary px-2.5 py-0.5 rounded-full">
                  {team.machines.length} Total
                </span>
              </div>
              <div className="p-1">
                <DataTable columns={columnsMachines} data={team.machines} />
              </div>
            </section>

            {/* Inventory Section - Full Width */}
            <section className="lg:col-span-2 bg-card rounded-xl border shadow-sm flex flex-col overflow-hidden">
              <div className="px-6 py-4 border-b bg-muted/30 flex justify-between items-center">
                <h2 className="font-semibold text-lg flex items-center gap-2">
                  <Box className="h-5 w-5 text-primary" /> Inventory items
                </h2>
                <span className="text-xs font-medium bg-primary/10 text-primary px-2.5 py-0.5 rounded-full">
                  {team.inventory.length} Total
                </span>
              </div>
              <div className="p-1">
                <DataTable columns={columnsInventory} data={team.inventory} />
              </div>
            </section>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
