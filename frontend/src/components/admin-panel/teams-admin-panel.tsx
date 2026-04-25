import { useQuery } from '@tanstack/react-query'
import { MoreHorizontal } from 'lucide-react'
import { useState } from 'react'
import { PageIsLoading } from '../page-is-loading'
import { DataTable } from '../ui/data-table'

import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
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
import type { ApiTeamItem } from '@/integrations/teams/teams.types'
import { adminTeamsQueryOptions } from '@/integrations/teams/teams.query'
import {
  useCreateTeamMutation,
  useDeleteTeamMutation,
} from '@/integrations/teams/teams.mutation'

const formatHeader = (key: string) =>
  key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())

export const columns: Array<ColumnDef<ApiTeamItem>> = [
  ...(
    ['id', 'name', 'admins'] as Array<keyof ApiTeamItem>
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

      if (key === 'admins' && typeof value === 'string') {
        if (value === "No Admin" || !value || value === "-") {
            return <span className="text-muted-foreground">-</span>
        }

        const adminList = value.split(', ')
        return (
          <div className="flex flex-wrap gap-1">
            {adminList.map((admin, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="text-[10px]"
              >
                {admin}
              </Badge>
            ))}
          </div>
        )
      }

      return value ?? '-'
    },
  })),
  {
    id: 'actions',
    cell: ({ row }) => {
      const team = row.original
      const deleteTeam = useDeleteTeamMutation()

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

            {/* @todo implement team editing dialog */}
            <DropdownMenuItem onClick={() => console.log('Edit team', team)}>
              Edit Team
            </DropdownMenuItem>

            <DropdownMenuItem
              className="text-destructive"
              onClick={() => deleteTeam.mutate(team.id)}
            >
              Delete Team
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]

export default function TeamsAdminPanel() {
  const { data: teams = [], isLoading } = useQuery(adminTeamsQueryOptions)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const createTeam = useCreateTeamMutation()

  const newTeamTemplate = {
    name: '',
    team_admin_id: 1,
  }

  const handleCreateTeam = (data: typeof newTeamTemplate) => {
    createTeam.mutate(data, {
      onSuccess: () => setIsDialogOpen(false),
    })
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
