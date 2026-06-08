import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { PageIsLoading } from '../page-is-loading'
import { DataTable } from '../ui/data-table'

import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { GenericCreateDialog } from '../generic-create-dialog'

import { DataTableColumnHeader } from '../data-table/column-header'
import { DataTableRowActions } from '../data-table/row-actions'
import type { FieldConfig } from '../generic-create-dialog'
import type { ColumnDef } from '@tanstack/react-table'
import type { ApiTeamItem } from '@/integrations/teams/teams.types'
import type { fetchTeamData } from '@/integrations/teams/teams.adapter'
import { adminTeamsQueryOptions } from '@/integrations/teams/teams.query'
import {
  useCreateTeamMutation,
  useDeleteTeamMutation,
  useUpdateTeamMutation,
} from '@/integrations/teams/teams.mutation'
import { usersQueryOptions } from '@/integrations/user/user.query'
import { useChangeUserTeamAccessMutation } from '@/integrations/user/user.mutation'

const formatHeader = (key: string) =>
  key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())

type TeamItem = ReturnType<typeof fetchTeamData>[number]

export const columns: Array<ColumnDef<ApiTeamItem>> = [
  ...(['id', 'name', 'admins'] as Array<keyof ApiTeamItem>).map((key) => ({
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
        if (value === 'No Admin' || !value || value === '-') {
          return <span className="text-muted-foreground">-</span>
        }

        const adminList = value.split(', ')
        return (
          <div className="flex flex-wrap gap-1">
            {adminList.map((admin, index) => (
              <Badge key={index} variant="secondary" className="text-[10px]">
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
    meta: {
      headerClassName: 'sticky right-0 z-20',
      cellClassName: 'sticky right-0 z-10',
    },
    cell: ({ row, table }) => {
      const team = row.original
      const deleteTeam = useDeleteTeamMutation()
      const meta = table.options.meta as any

      return (
        <DataTableRowActions
          row={team}
          idBadge={team.id}
          actions={[
            {
              label: 'Promote User',
              onClick: () => meta?.onPromote?.(team),
            },
            {
              label: 'Edit',
              onClick: () => meta?.onEdit?.(team),
            },
            {
              label: 'Delete',
              isDestructive: true,
              onClick: () => deleteTeam.mutate(team.id),
            },
          ]}
        />
      )
    },
  },
]

export default function TeamsAdminPanel() {
  const navigate = useNavigate()

  const { data: teams = [], isLoading } = useQuery(adminTeamsQueryOptions)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTeam, setEditingTeam] = useState<TeamItem | null>(null)
  const [promotingTeam, setPromotingTeam] = useState<TeamItem | null>(null)

  const createTeam = useCreateTeamMutation()
  const updateTeam = useUpdateTeamMutation(editingTeam?.id || 0)
  const changeUserAccess = useChangeUserTeamAccessMutation()
  const { data: users } = useQuery(usersQueryOptions)

  const fieldsConfig: Record<string, FieldConfig> = {
    name: {
      type: 'text',
    },
    team_admin_id: {
      type: 'select',
      options: (users || [])
        .filter(
          (user) =>
            user.user_type === 'admin' ||
            user.user_type === 'group_admin' ||
            user.id === editingTeam?.team_admin_id,
        )
        .map((user) => ({
          label: `${user.name} ${user.surname}`,
          value: String(user.id),
        })),
    },
  }

  const promoteFieldsConfig: Record<string, FieldConfig> = {
    promote_user_id: {
      type: 'select',
      options: (users || []).map((user) => ({
        label: `${user.name} ${user.surname}`,
        value: String(user.id),
      })),
    },
  }

  const newTeamTemplate = {
    name: '',
    team_admin_id: '',
  }

  const handleCreateTeam = (data: any) => {
    createTeam.mutate(
      {
        ...data,
        team_admin_id: Number(data.team_admin_id),
      },
      {
        onSuccess: () => setIsDialogOpen(false),
      },
    )
  }

  const handleEditTeam = (data: any) => {
    updateTeam.mutate(
      {
        ...data,
        team_admin_id: Number(data.team_admin_id),
      },
      {
        onSuccess: () => setEditingTeam(null),
      },
    )
  }

  const handlePromoteUser = (data: any) => {
    if (promotingTeam && data.promote_user_id) {
      changeUserAccess.mutate(
        {
          userId: Number(data.promote_user_id),
          data: {
            team_id: promotingTeam.id,
            is_group_admin: true,
          },
        },
        { onSuccess: () => setPromotingTeam(null) },
      )
    }
  }

  if (isLoading) return <PageIsLoading />

  return (
    <>
      <DataTable
        columns={columns}
        data={teams}
        meta={{ onEdit: setEditingTeam, onPromote: setPromotingTeam }}
        onRowClick={(row) => {
          navigate({
            to: '/teams/$teamId',
            params: { teamId: String(row.id) },
          })
        }}
        actionElement={
          <>
            <Button onClick={() => setIsDialogOpen(true)}>Add New Team</Button>

            <GenericCreateDialog
              title="Create new team"
              isOpen={isDialogOpen}
              onClose={() => setIsDialogOpen(false)}
              defaultValues={newTeamTemplate}
              fieldsConfig={fieldsConfig}
              onSubmit={handleCreateTeam}
            />
          </>
        }
      />

      {editingTeam && (
        <GenericCreateDialog
          title="Edit Team"
          isOpen={!!editingTeam}
          onClose={() => setEditingTeam(null)}
          defaultValues={{
            name: editingTeam.name,
            team_admin_id: String(editingTeam.team_admin_id || ''),
          }}
          fieldsConfig={fieldsConfig}
          onSubmit={handleEditTeam}
        />
      )}

      {promotingTeam && (
        <GenericCreateDialog
          title={`Promote User in ${promotingTeam.name}`}
          isOpen={!!promotingTeam}
          onClose={() => setPromotingTeam(null)}
          defaultValues={{
            promote_user_id: '',
          }}
          fieldsConfig={promoteFieldsConfig}
          onSubmit={handlePromoteUser}
        />
      )}
    </>
  )
}
