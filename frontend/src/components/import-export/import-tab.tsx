import { AlertCircleIcon, Info, Loader2, Send, Upload } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
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
import { parseCSV } from '@/lib/csv-parser'

/**
 * Configuration for CSV-to-Database mapping.
 * Specifies table identifiers, display names, and field-level requirements.
 * @todo Migrate to backend-driven schema discovery.
 */

const AVAILABLE_TABLES: Array<TableConfig> = [
  {
    id: 'history',
    name: 'History',
    fields: [
      { key: 'id', label: 'ID', required: true },
      { key: 'entity_type', label: 'Entity Type', required: true },
      { key: 'action', label: 'Action', required: true },
      { key: 'entity_id', label: 'Entity ID' },
      { key: 'user_id', label: 'User ID' },
      { key: 'timestamp', label: 'Timestamp' },
      { key: 'before_state', label: 'Before State' },
      { key: 'after_state', label: 'After State' },
      { key: 'can_rollback', label: 'Can Rollback' },
      { key: 'extra_data', label: 'Extra Data' },
    ],
  },
  {
    id: 'inventory',
    name: 'Inventory',
    fields: [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Item Name', required: true },
      { key: 'quantity', label: 'Quantity', required: true },
      { key: 'team_id', label: 'Team ID' },
      { key: 'localization_id', label: 'Localization ID' },
      { key: 'machine_id', label: 'Machine ID' },
      { key: 'category_id', label: 'Category ID' },
      { key: 'rental_status', label: 'Rental Status' },
      { key: 'rental_id', label: 'Rental ID' },
      { key: 'version_id', label: 'Version' },
    ],
  },
  {
    id: 'machines',
    name: 'Machines',
    fields: [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Machine Name', required: true },
      { key: 'localization_id', label: 'Localization ID' },
      { key: 'mac_address', label: 'MAC Address' },
      { key: 'ip_address', label: 'IP Address' },
      { key: 'pdu_port', label: 'PDU Port' },
      { key: 'team_id', label: 'Team ID' },
      { key: 'os', label: 'Operating System' },
      { key: 'serial_number', label: 'Serial Number' },
      { key: 'note', label: 'Notes' },
      { key: 'added_on', label: 'Added On' },
      { key: 'cpu', label: 'CPU' },
      { key: 'ram', label: 'RAM' },
      { key: 'disk', label: 'Disk' },
      { key: 'metadata_id', label: 'Metadata ID' },
      { key: 'layout_id', label: 'Layout ID' },
      { key: 'version_id', label: 'Version' },
    ],
  },
  {
    id: 'teams',
    name: 'Teams',
    fields: [
      { key: 'id', label: 'ID', required: true },
      { key: 'name', label: 'Team Name' },
      { key: 'team_admin_id', label: 'Admin ID' },
      { key: 'version_id', label: 'Version' },
    ],
  },
  {
    id: 'user',
    name: 'Users',
    fields: [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'First Name', required: true },
      { key: 'surname', label: 'Last Name', required: true },
      { key: 'team_id', label: 'Team ID' },
      { key: 'login', label: 'Login/Username' },
      { key: 'email', label: 'Email Address', required: true },
      { key: 'is_active', label: 'Active Status' },
      { key: 'is_superuser', label: 'Superuser' },
      { key: 'is_verified', label: 'Verified' },
      { key: 'user_type', label: 'User Type' },
      {
        key: 'force_password_change',
        label: 'Force Password Change',
      },
      { key: 'version_id', label: 'Version' },
    ],
  },
]

export default function ImportPage() {
  const [csvData, setCsvData] = useState<ParsedCSV | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [mapping, setMapping] = useState<ColumnMapping>({})
  const [submitResult, setSubmitResult] = useState<{
    success: boolean
    message: string
  } | null>(null)

  const handleFileLoaded = useCallback((content: string, name: string) => {
    const parsed = parseCSV(content)
    setCsvData(parsed)
    setFileName(name)
    setMapping({})
    setSubmitResult(null)
  }, [])

  const handleClearFile = useCallback(() => {
    setCsvData(null)
    setFileName(null)
    setMapping({})
    setSubmitResult(null)
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

  const selectedTableConfig = AVAILABLE_TABLES.find(
    (t) => t.id === selectedTable,
  )

  const buildMappedData = () => {
    if (!csvData || !selectedTableConfig) return []

    return csvData.rows.map((row) => {
      const record: Record<string, string> = {}

      csvData.headers.forEach((header, index) => {
        const fieldKey = mapping[header]
        if (fieldKey) {
          record[fieldKey] = row[index] || ''
        }
      })

      return record
    })
  }

  const { mutate: importData, isPending } = useMutation({
    mutationFn: async (payload: {
      table: string
      data: Array<any>
      mapping: any
    }) => {
      const response = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      console.log(JSON.stringify(payload))

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'Import failed')
      }

      if (response.status === 204) {
        return { success: true, message: 'Import successful!' }
      }

      const text = await response.text()
      return text
        ? JSON.parse(text)
        : { success: true, message: 'Import successful!' }
    },
    onSuccess: (result) => {
      setSubmitResult({
        success: true,
        message: result.message || 'Import successful!',
      })
    },
    onError: (error: Error) => {
      setSubmitResult({
        success: false,
        message: error.message,
      })
    },
  })

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

    importData({
      table: selectedTable!,
      data: mappedData,
      mapping: mapping,
    })
  }

  const canSubmit =
    csvData && selectedTable && Object.values(mapping).some((v) => v !== null)

  return (
    <main className="container mx-auto py-8">
      <header className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <Upload className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">CSV Import Tool</h1>
        </div>
        <p className="text-muted-foreground">
          Upload your CSV file, select a table, and map columns to import your
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
              <div className="space-y-4">
                <h3 className="font-medium">Target Table</h3>
                <TableSelector
                  tables={AVAILABLE_TABLES}
                  selectedTable={selectedTable}
                  onTableSelect={handleTableSelect}
                />
              </div>

              {selectedTableConfig && (
                <div className="space-y-4">
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
                {!canSubmit && selectedTable && (
                  <span className="text-sm text-muted-foreground">
                    Map at least one column to continue
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Getting Started */}
        {!csvData && (
          <Card className="border-dashed bg-muted/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Info className="h-5 w-5" />
                Getting Started
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[
                  {
                    step: '01',
                    title: 'Upload',
                    desc: 'Select or drag your CSV file',
                  },
                  {
                    step: '02',
                    title: 'Target',
                    desc: 'Choose the destination table',
                  },
                  {
                    step: '03',
                    title: 'Map',
                    desc: 'Link CSV columns to fields',
                  },
                  {
                    step: '04',
                    title: 'Review',
                    desc: 'Preview and confirm import',
                  },
                ].map((item) => (
                  <Card key={item.step} className="bg-muted/30 border-dashed">
                    <CardContent>
                      <span className="text-2xl font-bold text-primary">
                        {item.step}
                      </span>
                      <h4 className="font-semibold mt-1">{item.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {item.desc}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}
