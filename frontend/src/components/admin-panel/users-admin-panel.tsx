import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { PageIsLoading } from '../page-is-loading'
import { DataTable } from '../ui/data-table'

import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { GenericCreateDialog } from '../generic-create-dialog'
import { DataTableColumnHeader } from '../data-table/column-header'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Label } from '../ui/label'
import { Input } from '../ui/input'
import { DataTableRowActions } from '../data-table/row-actions'
import type { FieldConfig } from '../generic-create-dialog'
import type { fetchUserData } from '@/integrations/user/user.adapter'
import type { ColumnDef } from '@tanstack/react-table'
import type { UserCreate, UserUpdate } from '@/integrations/user/user.types'
import { adminUsersQueryOptions } from '@/integrations/user/user.query'
import {
  useCreateUserMutation,
  useDeleteUserMutation,
  useResetUserPasswordMutation,
  useUpdateUserMutation,
} from '@/integrations/user/user.mutation'
import { adminTeamsQueryOptions } from '@/integrations/teams/teams.query'

type UserItem = ReturnType<typeof fetchUserData>[number]

const HIDE_FIELDS = ['name', 'surname']

const formatHeader = (key: string) =>
  key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())

export const columns: Array<ColumnDef<UserItem>> = [
  {
    id: 'fullName',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Full Name" />
    ),
    accessorFn: (row) => `${row.name} ${row.surname}`,
    cell: ({ getValue }) => (
      <span className="font-medium">{getValue<string>()}</span>
    ),
  },

  ...(
    [
      'id',
      'email',
      'login',
      'membership',
      'user_type',
      'force_password_change',
    ] as Array<keyof UserItem>
  )
    .filter((key) => !HIDE_FIELDS.includes(key as string))
    .map((key) => ({
      accessorKey: key,
      header: ({ column }: any) => (
        <DataTableColumnHeader
          column={column}
          title={formatHeader(key as string)}
        />
      ),
      cell: ({ getValue }: { getValue: () => any }) => {
        const value = getValue()

        if (key === 'membership' && Array.isArray(value)) {
          return (
            <div className="flex flex-wrap gap-1">
              {value.map((m: any) => (
                <Badge
                  key={m.team_id}
                  variant="secondary"
                  className="text-[10px]"
                >
                  {m.team_name} {m.is_group_admin && '(Admin)'}
                </Badge>
              ))}
              {value.length === 0 && '-'}
            </div>
          )
        }

        if (typeof value === 'boolean') {
          return (
            <Badge
              className={
                value
                  ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
                  : 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'
              }
            >
              {value ? 'YES' : 'NO'}
            </Badge>
          )
        }

        if (key === 'user_type' && typeof value === 'string') {
          return (
            value.charAt(0).toUpperCase() +
            value.slice(1).toLowerCase().replace('_', ' ')
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
      const user = row.original
      const deleteMutation = useDeleteUserMutation()
      const resetPasswordMutation = useResetUserPasswordMutation()
      const meta = table.options.meta as any

      return (
        <DataTableRowActions
          row={user}
          idBadge={user.id}
          actions={[
            {
              label: 'Edit User',
              onClick: (u) => meta?.onEdit?.(u),
            },
            {
              label: 'Reset password (WIP)',
              onClick: (u) => console.log('Reset user password', u.id),
            },
            {
              label: 'Force password change',
              onClick: (u) => resetPasswordMutation.mutate(u.id),
            },
            {
              label: 'Delete User',
              isDestructive: true,
              onClick: (u) => deleteMutation.mutate(u.id),
            },
          ]}
        />
      )
    },
  },
]

export default function UserAdminPanel() {
  const navigate = useNavigate()

  const { data: users = [], isLoading } = useQuery(adminUsersQueryOptions)
  const { data: teams = [] } = useQuery(adminTeamsQueryOptions)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserItem | null>(null)

  const [generatedCredentials, setGeneratedCredentials] = useState<{
    login: string
    password: string
  } | null>(null)

  const createUser = useCreateUserMutation()
  const updateUser = useUpdateUserMutation(editingUser?.id || '')

  const fieldsConfig: Record<string, FieldConfig> = {
    user_type: {
      type: 'select',
      options: [
        { label: 'User', value: 'user' },
        { label: 'Admin', value: 'admin' },
        { label: 'Group Admin', value: 'group_admin' },
      ],
    },
    team_ids: {
      type: 'multi-select',
      options: teams.map((team) => ({
        label: team.name,
        value: String(team.id),
      })),
    },
    password: {
      type: 'password',
    },
  }

  const newUserTemplate: UserCreate = {
    name: '',
    surname: '',
    login: '',
    email: '',
    team_ids: [],
    user_type: 'user',
    password: '',
  }

  const handleCreateUser = (data: UserCreate) => {
    createUser.mutate(data, {
      onSuccess: (response) => {
        setIsDialogOpen(false)
        if (response.generated_password) {
          setGeneratedCredentials({
            login: response.login,
            password: response.generated_password,
          })
        }
      },
    })
  }

  const handleEditUser = (data: UserUpdate) => {
    updateUser.mutate(data, {
      onSuccess: () => setEditingUser(null),
    })
  }

  if (isLoading) return <PageIsLoading />

  return (
    <>
      <DataTable
        columns={columns}
        data={users}
        meta={{ onEdit: setEditingUser }}
        onRowClick={(row) => {
          navigate({
            to: '/users/$userId',
            params: { userId: String(row.id) },
          })
        }}
        actionElement={
          <>
            <Button onClick={() => setIsDialogOpen(true)}>Add New User</Button>

            <GenericCreateDialog
              title="Create New User"
              isOpen={isDialogOpen}
              onClose={() => setIsDialogOpen(false)}
              defaultValues={newUserTemplate}
              fieldsConfig={fieldsConfig}
              onSubmit={handleCreateUser}
            />
          </>
        }
      />

      {editingUser && (
        <GenericCreateDialog
          title="Edit User"
          isOpen={!!editingUser}
          onClose={() => setEditingUser(null)}
          defaultValues={{
            name: editingUser.name,
            surname: editingUser.surname,
            login: editingUser.login,
            email: editingUser.email,
            user_type: editingUser.user_type,
            team_ids:
              editingUser.membership?.map((m: any) => String(m.team_id)) || [],
          }}
          fieldsConfig={fieldsConfig}
          onSubmit={handleEditUser}
        />
      )}

      <Dialog
        open={!!generatedCredentials}
        onOpenChange={(open) => {
          if (!open) setGeneratedCredentials(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>User Created Successfully</DialogTitle>
            <DialogDescription>
              Here are login credentials for this user. Please copy it now, as
              it will not be shown again.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Login</Label>
              <Input readOnly value={generatedCredentials?.login || ''} />
            </div>
            <div className="grid gap-2">
              <Label>Password</Label>
              <Input readOnly value={generatedCredentials?.password || ''} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setGeneratedCredentials(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
