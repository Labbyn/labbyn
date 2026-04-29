import { MoreHorizontal } from 'lucide-react'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'

export interface RowAction<T> {
  label: React.ReactNode
  onClick: (row: T) => void
  isDestructive?: boolean
  disabled?: boolean
  hidden?: (row: T) => boolean
}

interface DataTableRowActionsProps<T> {
  row: T
  actions: Array<RowAction<T>>
  title?: string
  idBadge?: string | number
}

export function DataTableRowActions<T>({
  row,
  actions,
  title = 'Actions',
  idBadge,
}: DataTableRowActionsProps<T>) {
  const visibleActions = actions.filter(
    (action) => !action.hidden || !action.hidden(row),
  )

  if (visibleActions.length === 0) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className="h-8 w-8 p-0 backdrop-blur-xs bg-card/30 rounded-xl border border-border/40"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuLabel>
          {title}{' '}
          {idBadge !== undefined && (
            <Badge variant="secondary">ID: {idBadge}</Badge>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {visibleActions.map((action, index) => (
          <DropdownMenuItem
            key={index}
            disabled={action.disabled}
            className={
              action.isDestructive
                ? 'text-destructive focus:bg-destructive/10 focus:text-destructive'
                : ''
            }
            onClick={(e) => {
              e.stopPropagation()
              action.onClick(row)
            }}
          >
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
