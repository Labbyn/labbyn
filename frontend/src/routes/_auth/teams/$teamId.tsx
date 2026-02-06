import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
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

function TeamsDetailsPage() {
  const router = useRouter()
  const { teamId } = Route.useParams()
  const { data: team } = useSuspenseQuery(singleTeamQueryOptions(teamId))

  // temporarly mock users because there's no endpoint for fetching teams + members
  const columns: Array<ColumnDef<any>> = [
    {
      accessorKey: 'email',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Email" />
      ),
    },
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="First Name" />
      ),
    },
    {
      accessorKey: 'surname',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Last Name" />
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
        <DataTableColumnHeader column={column} title="Role" />
      ),
    },
  ]
  const userList = [
    {
      email: 'Waiting',
      name: 'For',
      surname: 'Team',
      login: 'and user',
      user_type: 'endpoint',
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
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight">{team.name}</h1>
          </div>
        </div>
      </div>
      <Separator />
      <ScrollArea className="h-full">
        <div className="p-6 flex flex-col gap-4">
          <DataTable columns={columns} data={userList} />
        </div>
      </ScrollArea>
    </div>
  )
}
