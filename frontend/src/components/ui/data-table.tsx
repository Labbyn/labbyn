import React from 'react'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { CaptionsOff, RefreshCcwIcon, SearchIcon } from 'lucide-react'
import { rankItem } from '@tanstack/match-sorter-utils'
import { DataTableViewOptions } from '../data-table/view-options'
import { DataTablePagination } from '../data-table/pagination'
import { InputGroup, InputGroupAddon, InputGroupInput } from './input-group'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from './empty'
import { Button } from './button'
import type {
  ColumnDef,
  ColumnFiltersState,
  FilterFn,
  SortingState,
} from '@tanstack/react-table'
import {
  // NOTE: <Table> from shadcn wraps <table> in <div className="overflow-auto">
  // which breaks position:sticky on <thead>. We use raw <table> instead.
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const fuzzyFilter: FilterFn<any> = (row, columnId, value, addMeta) => {
  const itemRank = rankItem(row.getValue(columnId), value)
  addMeta({ itemRank })
  return itemRank.passed
}

interface DataTableProps<TData, TValue> {
  columns: Array<ColumnDef<TData, TValue>>
  data: Array<TData>
  onRowClick?: (row: TData) => void
  selectedId?: string
  actionElement?: React.ReactNode
}

export function DataTable<TData, TValue>({
  columns,
  data,
  onRowClick,
  selectedId,
  actionElement,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  )
  const [globalFilter, setGlobalFilter] = React.useState<string>('')
  const scrollRef = React.useRef<HTMLDivElement>(null)

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, globalFilter },
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: fuzzyFilter,
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0
    }
  }, [table.getState().pagination.pageIndex])

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Data table header */}
      <div className="shrink-0 flex gap-4">
        <InputGroup>
          <InputGroupInput
            placeholder="Search..."
            value={globalFilter}
            onChange={(event) => setGlobalFilter(event.target.value)}
          />
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
        </InputGroup>
        <DataTableViewOptions table={table} />
        {actionElement}
      </div>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 rounded-md border overflow-auto"
      >
        <table className="min-w-full caption-bottom text-sm">
          <TableHeader className="bg-secondary sticky top-0 z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="px-4">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={
                    String(row.original.id) === selectedId
                      ? 'selected'
                      : undefined
                  }
                  className="cursor-pointer"
                  // Handle click interaction
                  onClick={() => onRowClick && onRowClick(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="p-3">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  <Empty className="h-full">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <CaptionsOff />
                      </EmptyMedia>
                      <EmptyTitle>No data to display</EmptyTitle>
                      <EmptyDescription className="max-w-xs text-pretty">
                        There is not records for this data table. New records
                        will appear here.
                      </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                      <Button
                        variant="outline"
                        onClick={() => window.location.reload()}
                      >
                        <RefreshCcwIcon className="mr-2 h-4 w-4" />
                        Refresh
                      </Button>
                    </EmptyContent>
                  </Empty>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </table>
      </div>

      <div className="shrink-0">
        <DataTablePagination table={table} />
      </div>
    </div>
  )
}
