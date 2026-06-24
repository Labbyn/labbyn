import { AlertCircleIcon, Loader2, Send, Upload, Users } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Alert, AlertDescription, AlertTitle } from '../ui/alert'
import { TableSelector } from './table-selector'
import { FileUpload } from './file-upload'
import { ColumnMapper } from './column-mapper'
import { DataPreview } from './data-preview'
import type { TableConfig } from './table-selector'
import type { ColumnMapping } from './column-mapper'
import type { ParsedCSV } from '@/lib/csv-parser'
import type { ImportReportResponse } from '@/integrations/import-export/import-export.types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { parseCSV } from '@/lib/csv-parser'
import { useImportDataMutation } from '@/integrations/import-export/import-export.mutation'
import { currentUserTeamsQueryOptions } from '@/integrations/teams/teams.query'

const AVAILABLE_TABLES: Array<TableConfig> = [
  {
    id: 'inventory',
    name: 'Inventory',
    fields: [
      { key: 'name', label: 'Item Name', required: true },
      { key: 'quantity', label: 'Quantity', required: true },
      { key: 'team_id', label: 'Team ID' },
      { key: 'localization_id', label: 'Localization ID' },
      { key: 'machine_id', label: 'Machine ID' },
      { key: 'category_id', label: 'Category ID' },
      { key: 'rental_status', label: 'Rental Status' },
      { key: 'rental_id', label: 'Rental ID' },
    ],
  },
  {
    id: 'machines',
    name: 'Machines',
    fields: [
      { key: 'name', label: 'Machine Name', required: true },
      { key: 'localization_id', label: 'Localization ID' },
      { key: 'mac_address', label: 'MAC Address' },
      { key: 'ip_address', label: 'IP Address' },
      { key: 'pdu_port', label: 'PDU Port' },
      { key: 'team_id', label: 'Team ID' },
      { key: 'os', label: 'Operating System' },
      { key: 'serial_number', label: 'Serial Number' },
      { key: 'note', label: 'Notes' },
      { key: 'cpu', label: 'CPU' },
      { key: 'ram', label: 'RAM' },
      { key: 'disk', label: 'Disk' },
    ],
  },
  {
    id: 'racks',
    name: 'Racks',
    fields: [
      { key: 'name', label: 'Rack Name', required: true },
      { key: 'room_id', label: 'Room ID' },
      { key: 'team_id', label: 'Team ID' },
      { key: 'capacity', label: 'Capacity' },
      { key: 'description', label: 'Description' },
    ],
  },
]

export default function ImportPage() {
  const { data: teams = [] } = useQuery(currentUserTeamsQueryOptions)
  const [importReport, setImportReport] = useState<ImportReportResponse | null>(
    null,
  )
  const [csvData, setCsvData] = useState<ParsedCSV | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [selectedUiTeam, setSelectedUiTeam] = useState<number | null>(null)
  const [mapping, setMapping] = useState<ColumnMapping>({})
  const [submitResult, setSubmitResult] = useState<{
    success: boolean
    message: string
  } | null>(null)

  const { mutate: importData, isPending } = useImportDataMutation()

  const handleFileLoaded = useCallback((content: string, name: string) => {
    const parsed = parseCSV(content)
    setCsvData(parsed)
    setFileName(name)
    setMapping({})
    setSubmitResult(null)
    setImportReport(null)
  }, [])

  const handleClearFile = useCallback(() => {
    setCsvData(null)
    setFileName(null)
    setMapping({})
    setSubmitResult(null)
    setImportReport(null)
  }, [])

  const handleTableSelect = useCallback(
    (tableId: string) => {
      setSelectedTable(tableId)
      setSubmitResult(null)

      // Auto-map columns that match table field keys or labels exactly
      const tableConfig = AVAILABLE_TABLES.find((t) => t.id === tableId)
      if (tableConfig && csvData) {
        const autoMapping: Record<string, string | null> = {}

        csvData.headers.forEach((header) => {
          const normalizedHeader = header
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '_')

          // Try to find a matching field by key or label
          const matchingField = tableConfig.fields.find((field) => {
            const normalizedKey = field.key.toLowerCase()
            const normalizedLabel = field.label
              .toLowerCase()
              .trim()
              .replace(/\s+/g, '_')
            return (
              normalizedHeader === normalizedKey ||
              normalizedHeader === normalizedLabel ||
              header.toLowerCase().trim() === field.label.toLowerCase().trim()
            )
          })

          // Only auto-map if the field isn't already mapped
          if (
            matchingField &&
            !Object.values(autoMapping).includes(matchingField.key)
          ) {
            autoMapping[header] = matchingField.key
          } else {
            autoMapping[header] = null
          }
        })

        setMapping(autoMapping)
      } else {
        setMapping({})
      }
    },
    [csvData],
  )

  const handleMappingChange = useCallback(
    (csvColumn: string, fieldKey: string | null) => {
      setMapping((prev) => ({
        ...prev,
        [csvColumn]: fieldKey,
      }))
      setSubmitResult(null)
    },
    [],
  )

  const buildMappedData = () => {
    if (!csvData || !selectedTableConfig) return []

    return csvData.rows.map((row) => {
      const record: Record<string, any> = {}

      csvData.headers.forEach((header, index) => {
        const fieldKey = mapping[header]
        if (fieldKey) {
          let value: string | number = row[index]?.trim() || ''

          if (typeof value === 'string') {
            value = value.replace(/\p{Cc}/gu, '')
          }

          if (value !== '' && !isNaN(Number(value))) {
            value = Number(value)
          }

          record[fieldKey] = value
        }
      })

      return record
    })
  }

  const handleSubmit = () => {
    const mappedData = buildMappedData()

    const requiredFields =
      selectedTableConfig?.fields.filter((f) => f.required) || []
    const mappedFields = Object.values(mapping).filter((v) => v !== null)
    const missingRequired = requiredFields.filter(
      (f) => !mappedFields.includes(f.key),
    )

    if (missingRequired.length > 0) {
      setSubmitResult({
        success: false,
        message: `Missing required fields: ${missingRequired.map((f) => f.label).join(', ')}`,
      })
      return
    }

    importData(
      {
        entityType: selectedTable!,
        payload: {
          ui_team_id: selectedUiTeam!,
          rows: mappedData,
        },
      },
      {
        onSuccess: (data) => {
          if (typeof data !== 'string') {
            setImportReport(data)
            setSubmitResult(null)
          } else {
            setSubmitResult({
              success: true,
              message: typeof data === 'string' ? data : 'Import successful!',
            })
            setImportReport(null)
          }
        },
        onError: (error: any) => {
          const errorData = error.response?.data
          const reportPayload = errorData?.summary
            ? errorData
            : errorData?.detail?.summary
              ? errorData.detail
              : null

          if (reportPayload && reportPayload.summary) {
            setImportReport(reportPayload)
            setSubmitResult(null)
            return
          }

          const detail = errorData?.detail
          let errorMsg = 'Import failed'

          if (detail) {
            errorMsg = Array.isArray(detail)
              ? detail
                  .map((e: any) => `${e.loc?.join('.') || 'Error'}: ${e.msg}`)
                  .join(', ')
              : typeof detail === 'string'
                ? detail
                : JSON.stringify(detail)
          } else if (errorData?.message) {
            errorMsg =
              typeof errorData.message === 'string'
                ? errorData.message
                : JSON.stringify(errorData.message)
          } else if (error.message) {
            errorMsg = error.message
          }

          setSubmitResult({
            success: false,
            message: errorMsg,
          })
          setImportReport(null)
        },
      },
    )
  }

  const selectedTableConfig = AVAILABLE_TABLES.find(
    (t) => t.id === selectedTable,
  )

  const canSubmit =
    csvData &&
    selectedTable &&
    selectedUiTeam !== null &&
    Object.values(mapping).some((v) => v !== null)

  return (
    <main className="container mx-auto py-8">
      <header className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <Upload className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">CSV Import Tool</h1>
        </div>
        <p className="text-muted-foreground">
          Upload your CSV file, select a context, and map columns to import your
          data.
        </p>
      </header>

      <div className="grid gap-8">
        {/* Step 1: Upload File */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
              Step 1: Upload File
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FileUpload
              onFileLoaded={handleFileLoaded}
              fileName={fileName}
              onClear={handleClearFile}
            />
            {csvData && (
              <p className="mt-3 text-sm text-muted-foreground">
                Found {csvData.headers.length} columns and {csvData.rows.length}{' '}
                rows
              </p>
            )}
          </CardContent>
        </Card>

        {/* Step 2 & 3: Table and Mapping */}
        {csvData && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                Step 2 & 3: Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="grid sm:grid-cols-2 gap-8">
                {/* Context Team Selection */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Users className="h-4 w-4 text-primary" />
                    <span>Target Context (Team)</span>
                  </div>
                  <Select
                    value={selectedUiTeam?.toString() || ''}
                    onValueChange={(v) => setSelectedUiTeam(Number(v))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a team..." />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id.toString()}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Table Selection */}
                <div className="space-y-4">
                  <TableSelector
                    tables={AVAILABLE_TABLES}
                    selectedTable={selectedTable}
                    onTableSelect={handleTableSelect}
                  />
                </div>
              </div>

              {selectedTableConfig && (
                <div className="space-y-4 border-t pt-6">
                  <h3 className="font-medium">Column Mapping</h3>
                  <ColumnMapper
                    csvHeaders={csvData.headers}
                    tableFields={selectedTableConfig.fields}
                    mapping={mapping}
                    onMappingChange={handleMappingChange}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 4: Preview & Submit */}
        {csvData && selectedTableConfig && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                Step 4: Preview & Submit
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <DataPreview
                headers={csvData.headers}
                rows={csvData.rows}
                mapping={mapping}
                tableFields={selectedTableConfig.fields}
              />

              {submitResult && (
                <Alert
                  variant={submitResult.success ? 'default' : 'destructive'}
                >
                  <AlertCircleIcon />
                  <AlertTitle>
                    {submitResult.success ? 'Success' : 'Error'}
                  </AlertTitle>
                  <AlertDescription>{submitResult.message}</AlertDescription>
                </Alert>
              )}

              <div className="flex items-center gap-4 pt-4">
                <Button
                  onClick={handleSubmit}
                  disabled={!canSubmit || isPending}
                  size="lg"
                  className="w-full md:w-auto font-bold"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Import Data
                    </>
                  )}
                </Button>
                {!canSubmit && (selectedTable || selectedUiTeam) && (
                  <span className="text-sm text-muted-foreground">
                    Select a team, a table, and map at least one column to
                    continue
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 5: Post-Import Report */}
        {importReport && (
          <Card
            className={`border-2 ${importReport.summary.failed > 0 ? 'border-destructive/50' : 'border-green-500/50'}`}
          >
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                <AlertCircleIcon className="h-4 w-4" />
                Import Results Report
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col bg-muted p-4 rounded-lg">
                  <span className="text-sm text-muted-foreground">
                    Total Rows Processed
                  </span>
                  <span className="text-3xl font-bold">
                    {importReport.summary.total || 0}
                  </span>
                </div>
                <div className="flex flex-col bg-green-500/10 text-green-600 p-4 rounded-lg">
                  <span className="text-sm font-medium">
                    Successfully Imported
                  </span>
                  <span className="text-3xl font-bold">
                    {importReport.summary.success || 0}
                  </span>
                </div>
                <div className="flex flex-col bg-destructive/10 text-destructive p-4 rounded-lg">
                  <span className="text-sm font-medium">Failed</span>
                  <span className="text-3xl font-bold">
                    {importReport.summary.failed || 0}
                  </span>
                </div>
              </div>

              {importReport.summary.failed > 0 &&
                Array.isArray(importReport.details) &&
                importReport.details.length > 0 && (
                  <div className="space-y-3 pt-4 border-t">
                    <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                      Failed Rows Breakdown
                    </h4>
                    <div className="max-h-96 overflow-y-auto space-y-2 pr-2">
                      {importReport.details
                        .filter((d) => d.status === 'failed')
                        .map((detail, idx) => (
                          <Alert
                            variant="destructive"
                            key={`${detail.row}-${idx}`}
                          >
                            <AlertCircleIcon className="h-4 w-4" />
                            <AlertTitle>
                              Row {detail.row || '?'}:{' '}
                              {detail.name || 'Unknown'}
                            </AlertTitle>
                            <AlertDescription>
                              {detail.error || 'No error details provided.'}
                            </AlertDescription>
                          </Alert>
                        ))}
                    </div>
                  </div>
                )}
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}
