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
import type { fetchUserData } from '@/integrations/user/user.adapter'
import type { ColumnDef } from '@tanstack/react-table'
import type { UserCreate } from '@/integrations/user/user.types'
import { adminUsersQueryOptions } from '@/integrations/user/user.query'
import {
  useCreateUserMutation,
  useDeleteUserMutation,
  useResetUserPasswordMutation,
} from '@/integrations/user/user.mutation'

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
      'force_password_change'
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
                <Badge key={m.team_id} variant="secondary" className="text-[10px]">
                  {m.team_name} {m.is_group_admin && "(Admin)"}
                </Badge>
              ))}
              {value.length === 0 && "-"}
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
          return value.toUpperCase().replace('_', ' ')
        }

        return value ?? '-'
      },
    })),
  {
    id: 'actions',
    cell: ({ row }) => {
      const user = row.original
      const deleteMutation = useDeleteUserMutation()
      const resetPasswordMutation = useResetUserPasswordMutation()

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
              onClick={() => resetPasswordMutation.mutate(user.id)}
            >
              Force password reset
            </DropdownMenuItem>

            <DropdownMenuItem
              className="text-destructive"
              onClick={() => deleteMutation.mutate(user.id)}
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
  const { data: users = [], isLoading } = useQuery(adminUsersQueryOptions)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const [generatedCredentials, setGeneratedCredentials] = useState<{
    login: string
    password: string
  } | null>(null)

  const createUser = useCreateUserMutation()

  const newUserTemplate: UserCreate = {
    name: '',
    surname: '',
    login: '',
    email: '',
    team_id: null,
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

  if (isLoading) return <PageIsLoading />

  return (
    <>
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
