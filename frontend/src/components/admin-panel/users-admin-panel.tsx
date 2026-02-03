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
import type { fetchUserData } from '@/integrations/user/user.adapter'
import type { ColumnDef } from '@tanstack/react-table'
import { userQueryOptions } from '@/integrations/user/user.query'

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
      'team_id',
      'user_type',
      'is_active',
      'is_superuser',
      'is_verified',
      'force_password_change',
      'version_id',
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

        if (typeof value === 'boolean') {
          return (
            <Badge
              className={
                value
                  ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'
                  : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
              }
            >
              {value ? 'YES' : 'NO'}
            </Badge>
          )
        }

        return value ?? '-'
      },
    })),
  {
    id: 'actions',
    cell: ({ row }) => {
      const user = row.original

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

            <DropdownMenuItem onClick={() => console.log('Edit user', user.id)}>
              Edit User
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => console.log('Reset password', user.email)}
            >
              Reset Password
            </DropdownMenuItem>

            <DropdownMenuItem
              className="text-destructive"
              onClick={() => console.log('Delete user', user.id)}
            >
              Delete User
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]

export default function UserAdminPanel() {
  const { data: users = [], isLoading } = useQuery(userQueryOptions)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const newUserTemplate = {
    name: '',
    surname: '',
    login: null,
    email: '',
    team_id: null as number | null,
    user_type: 'USER' as const,
    password: '',
  }

  const handleCreateUser = (data: typeof newUserTemplate) => {
    console.log('Saving new user:', data)
    setIsDialogOpen(false)
  }

  if (isLoading) return <PageIsLoading />

  return (
    <DataTable
      columns={columns}
      data={users}
      actionElement={
        <>
          <Button onClick={() => setIsDialogOpen(true)}>Add New User</Button>

          <GenericCreateDialog
            title="Create New User"
            isOpen={isDialogOpen}
            onClose={() => setIsDialogOpen(false)}
            defaultValues={newUserTemplate}
            onSubmit={handleCreateUser}
          />
        </>
      }
    />
  )
}
