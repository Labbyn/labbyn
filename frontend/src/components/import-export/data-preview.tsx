'use client'

import { DataTable } from '../ui/data-table'
import type { ColumnDef } from '@tanstack/react-table'
import type { ColumnMapping, TableField } from './column-mapper'

interface DataPreviewProps {
  headers: Array<string>
  rows: Array<Array<string>>
  mapping: ColumnMapping
  tableFields: Array<TableField>
}

export function DataPreview({
  headers,
  rows,
  mapping,
  tableFields,
}: DataPreviewProps) {
  const previewData = rows.slice().map((row) => {
    const obj: Record<string, string> = {}
    headers.forEach((header, index) => {
      obj[header] = row[index]
    })
    return obj
  })

  const mappedHeaders = Object.entries(mapping)
    .filter(([_, fieldKey]) => fieldKey !== null)
    .map(([csvHeader]) => csvHeader)

  const columns: Array<ColumnDef<Record<string, string>>> = mappedHeaders.map(
    (header) => ({
      accessorKey: header,
      header:
        tableFields.find((f) => f.key === mapping[header])?.label || header,
      cell: ({ row }) => (
        <span className="whitespace-nowrap">{row.getValue(header) || '-'}</span>
      ),
    }),
  )

  if (mappedHeaders.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed p-12 text-center bg-muted/30">
        <p className="text-muted-foreground">
          Map your columns to generate a data preview
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-full overflow-hidden">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-semibold italic text-primary">
          Live Preview
        </h3>
        <span className="text-xs text-muted-foreground">
          {rows.length} total rows detected
        </span>
      </div>

      <DataTable columns={columns} data={previewData} />
    </div>
  )
}
