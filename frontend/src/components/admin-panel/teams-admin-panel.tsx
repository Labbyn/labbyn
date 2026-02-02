import { useQuery } from '@tanstack/react-query'
import { MoreHorizontal } from 'lucide-react'
import { useState } from 'react'
import { PageIsLoading } from '../page-is-loading'
import { DataTable } from '../ui/data-table'

import { Button } from '../ui/button'
import { GenericCreateDialog } from '../generic-create-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { DataTableColumnHeader } from '../data-table/column-header'
import type { ColumnDef } from '@tanstack/react-table'
import type { fetchTeamData } from '@/integrations/teams/teams.adapter'
import { teamQueryOptions } from '@/integrations/teams/teams.query'

type TeamItem = ReturnType<typeof fetchTeamData>[number]

const formatHeader = (key: string) =>
  key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())

export const columns: Array<ColumnDef<TeamItem>> = [
  ...(
    ['id', 'name', 'team_admin_id', 'version_id'] as Array<keyof TeamItem>
  ).map((key) => ({
    accessorKey: key,
    header: ({ column }: any) => (
      <DataTableColumnHeader
        column={column}
        title={formatHeader(key as string)}
      />
    ),
    cell: ({ getValue }: { getValue: () => any }) => {
      const value = getValue()

      return value ?? '-'
    },
  })),
  {
    id: 'actions',
    cell: ({ row }) => {
      const team = row.original

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={() => console.log('Edit team', team)}>
              Edit Team
            </DropdownMenuItem>

            <DropdownMenuItem className="text-destructive">
              Delete Team
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]

export default function TeamsAdminPanel() {
  const { data: teams = [], isLoading } = useQuery(teamQueryOptions)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const newTeamTemplate = {
    name: '',
    version_id: '',
    team_admin_id: '',
  }

  const handleCreateTeam = (data: typeof newTeamTemplate) => {
    console.log('Saving new team:', data)
    setIsDialogOpen(false)
  }

  if (isLoading) return <PageIsLoading />

  return (
    <DataTable
      columns={columns}
      data={teams}
      actionElement={
        <>
          <Button onClick={() => setIsDialogOpen(true)}>Add New Team</Button>

          <GenericCreateDialog
            title="Create new team"
            isOpen={isDialogOpen}
            onClose={() => setIsDialogOpen(false)}
            defaultValues={newTeamTemplate}
            onSubmit={handleCreateTeam}
          />
        </>
      }
    />
  )
}
