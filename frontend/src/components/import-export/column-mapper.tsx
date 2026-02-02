'use client'

import { ArrowRight, Check } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export interface TableField {
  key: string
  label: string
  required?: boolean
}

export interface ColumnMapping {
  [csvColumn: string]: string | null
}

interface ColumnMapperProps {
  csvHeaders: Array<string>
  tableFields: Array<TableField>
  mapping: ColumnMapping
  onMappingChange: (csvColumn: string, fieldKey: string | null) => void
}

export function ColumnMapper({
  csvHeaders,
  tableFields,
  mapping,
  onMappingChange,
}: ColumnMapperProps) {
  const getMappedFieldsCount = () => {
    return Object.values(mapping).filter((v) => v !== null).length
  }

  const requiredFields = tableFields.filter((f) => f.required)
  const mappedRequiredFields = requiredFields.filter((f) =>
    Object.values(mapping).includes(f.key),
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b-2 border-secondary pb-4">
        <p className="text-muted-foreground">
          Map your CSV columns to the corresponding table fields
        </p>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {getMappedFieldsCount()} of {csvHeaders.length} mapped
          </span>
          {requiredFields.length > 0 && (
            <span
              className={`text-sm font-medium ${
                mappedRequiredFields.length === requiredFields.length
                  ? 'text-green-600'
                  : 'text-primary'
              }`}
            >
              ({mappedRequiredFields.length}/{requiredFields.length} required)
            </span>
          )}
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        {csvHeaders.map((header) => (
          <div
            key={header}
            className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 border-b last:border-0"
          >
            <div className="flex items-center gap-2 min-w-50 max-w-full">
              <Check
                className={
                  mapping[header]
                    ? 'text-primary h-4 w-4'
                    : 'text-muted/50 h-4 w-4'
                }
              />
              <span className="truncate font-mono text-sm">{header}</span>
            </div>

            <ArrowRight className="hidden sm:block h-4 w-4 text-muted-foreground shrink-0" />

            <Select
              value={mapping[header] || 'unmapped'}
              onValueChange={(v) =>
                onMappingChange(header, v === 'unmapped' ? null : v)
              }
            >
              <SelectTrigger className="w-full sm:w-60">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unmapped">Skip Column</SelectItem>
                {tableFields.map((field) => (
                  <SelectItem
                    key={field.key}
                    value={field.key}
                    disabled={
                      Object.values(mapping).includes(field.key) &&
                      mapping[header] !== field.key
                    }
                  >
                    {field.label} {field.required && '*'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </div>
  )
}
