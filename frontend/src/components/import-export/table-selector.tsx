'use client'

import { Database } from 'lucide-react'
import type { TableField } from './column-mapper'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export interface TableConfig {
  id: string
  name: string
  fields: Array<TableField>
}

interface TableSelectorProps {
  tables: Array<TableConfig>
  selectedTable: string | null
  onTableSelect: (tableId: string) => void
}

export function TableSelector({
  tables,
  selectedTable,
  onTableSelect,
}: TableSelectorProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Database className="h-4 w-4 text-primary" />
        <span>Target Table</span>
      </div>
      <Select value={selectedTable || ''} onValueChange={onTableSelect}>
        <SelectTrigger className="w-full sm:w-70">
          <SelectValue placeholder="Select a table..." />
        </SelectTrigger>
        <SelectContent>
          {tables.map((table) => (
            <SelectItem key={table.id} value={table.id}>
              <div className="flex items-center justify-between w-full gap-4">
                <span>{table.name}</span>
                <span className="text-xs text-muted-foreground">
                  {table.fields.length} fields
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
