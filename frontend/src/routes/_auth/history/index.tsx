import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Eye, History, Info, MoreHorizontal, RotateCcw } from 'lucide-react'
import { useState } from 'react'

import type { ApiHistoryItem } from '@/integrations/history/history.types'
import type { ColumnDef } from '@tanstack/react-table'
import { PageIsLoading } from '@/components/page-is-loading'
import { DataTable } from '@/components/ui/data-table'
import { DataTableColumnHeader } from '@/components/data-table/column-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { historyQueryOptions } from '@/integrations/history/history.query'
import { useRollbackMutation } from '@/integrations/history/history.mutation'

export const Route = createFileRoute('/_auth/history/')({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(historyQueryOptions()),
  component: RouteComponent,
})

const actionMap = {
  create:
    'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 border-green-200',
  update:
    'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 border-blue-200',
  delete:
    'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 border-red-200',
} as const

const ActionBadge = ({
  action,
}: {
  action: keyof typeof actionMap | string
}) => {
  const className =
    (actionMap[action as keyof typeof actionMap] as string | undefined) ||
    'bg-gray-100 text-gray-700'
  return (
    <Badge variant="outline" className={className}>
      {action.toUpperCase()}
    </Badge>
  )
}

function RouteComponent() {
  const navigate = useNavigate()
  const { data: history = [], isLoading } = useQuery(historyQueryOptions())
  const [diffEntry, setDiffEntry] = useState<ApiHistoryItem | null>(null)

  const rollbackMutation = useRollbackMutation()

  const columns: Array<ColumnDef<ApiHistoryItem>> = [
    {
      accessorKey: 'timestamp',
      header: ({ column }: any) => (
        <DataTableColumnHeader column={column} title="Timestamp" />
      ),
      cell: ({ getValue }: any) => {
        const rawValue = getValue()
        const date = new Date(rawValue)
        return (
          <span className="text-muted-foreground tabular-nums">
            {date.toLocaleString()}
          </span>
        )
      },
    },
    {
      id: 'target',
      accessorFn: (row) => `${row.entity_name} ${row.entity_type}`,
      header: ({ column }: any) => (
        <DataTableColumnHeader column={column} title="Target" />
      ),
      cell: ({ row }: any) => (
        <div className="flex flex-col">
          <span className="font-semibold text-sm">
            {row.original.entity_name || row.original.entity_type}
          </span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
            {row.original.entity_type}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'action',
      header: ({ column }: any) => (
        <DataTableColumnHeader column={column} title="Action" />
      ),
      cell: ({ getValue }: any) => <ActionBadge action={getValue()} />,
    },
    {
      accessorKey: 'user',
      header: ({ column }: any) => (
        <DataTableColumnHeader column={column} title="Author" />
      ),
      accessorFn: (row: ApiHistoryItem) => row.user?.login ?? 'System',
    },
    {
      id: 'actions',
      cell: ({ row }: any) => {
        const entry = row.original

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Audit Options</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setDiffEntry(entry)}>
                <Eye className="mr-2 h-4 w-4" /> Compare Changes
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate({ to: `/history/${entry.id}` })}
              >
                <Info className="mr-2 h-4 w-4" /> Show details
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={!entry.can_rollback || rollbackMutation.isPending}
                onClick={() => rollbackMutation.mutate(entry.id)} //
                className="text-destructive focus:text-destructive"
              >
                <RotateCcw className="mr-2 h-4 w-4" /> Rollback Change
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  if (isLoading) return <PageIsLoading />

  return (
    <div className="p-6 space-y-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <History className="h-6 w-6 text-primary" /> Infrastructure Audit Logs
        </h1>
        <p className="text-muted-foreground text-sm">
          Review and revert modifications across the platform.
        </p>
      </header>

      <DataTable columns={columns} data={history} />

      {/* Diff View Dialog */}
      <Dialog open={!!diffEntry} onOpenChange={() => setDiffEntry(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              Comparing changes for {diffEntry?.entity_name}
            </DialogTitle>
            <DialogDescription>
              Reviewing{' '}
              <span className="font-mono text-primary px-1 bg-primary/10 rounded">
                {diffEntry?.action}
              </span>
              on {diffEntry?.entity_type} (ID: {diffEntry?.entity_id})
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto min-h-0 my-4">
            <div className="grid grid-cols-2 gap-px bg-border border rounded-lg overflow-hidden">
              {/* Left Column: Previous State */}
              <div className="bg-background p-4 flex flex-col">
                <div className="flex items-center gap-2 mb-4 text-xs font-bold uppercase tracking-wider text-muted-foreground sticky top-0 bg-background pb-2">
                  <div className="h-2 w-2 rounded-full bg-red-500" /> Previous
                  State
                </div>
                <pre className="text-[11px] font-mono leading-relaxed text-red-600 dark:text-red-400 whitespace-pre-wrap break-all">
                  {JSON.stringify(diffEntry?.before_state, null, 2)}
                </pre>
              </div>

              {/* Right Column: New State */}
              <div className="bg-background p-4 flex flex-col border-l">
                <div className="flex items-center gap-2 mb-4 text-xs font-bold uppercase tracking-wider text-muted-foreground sticky top-0 bg-background pb-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" /> New
                  State
                </div>
                <pre className="text-[11px] font-mono leading-relaxed text-green-600 dark:text-green-400 whitespace-pre-wrap break-all">
                  {JSON.stringify(diffEntry?.after_state, null, 2)}
                </pre>
              </div>
            </div>

            {/* Meta Information Section */}
            {diffEntry?.extra_data && (
              <div className="mt-4 border rounded-lg p-4 bg-muted/30">
                <h4 className="text-xs font-bold uppercase mb-2">
                  Meta Information
                </h4>
                <pre className="text-[11px] font-mono text-muted-foreground whitespace-pre-wrap">
                  {JSON.stringify(diffEntry.extra_data, null, 2)}
                </pre>
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <DialogClose asChild>
              <Button variant="outline">Close Audit</Button>
            </DialogClose>
            <Button
              variant="destructive"
              disabled={!diffEntry?.can_rollback || rollbackMutation.isPending}
              onClick={() => {
                if (diffEntry) {
                  rollbackMutation.mutate(diffEntry.id)
                  setDiffEntry(null)
                }
              }}
            >
              <RotateCcw className="mr-2 h-4 w-4" /> Rollback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
