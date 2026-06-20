import { useState } from 'react'
import { Database, Download, Loader2 } from 'lucide-react'
import { Button } from '../ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import { Field, FieldLabel } from '../ui/field'
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group'
import {
  useExportBulkMutation,
  useExportDataMutation,
} from '@/integrations/import-export/import-export.mutation'

const EXPORT_ENTITIES = [
  { id: 'inventory', name: 'Inventory' },
  { id: 'machines', name: 'Machines' },
  { id: 'racks', name: 'Racks' },
  { id: 'history', name: 'History' },
]

export function ExportTab() {
  const [selectedEntity, setSelectedEntity] = useState<string>('inventory')
  const [selectedFormat, setSelectedFormat] = useState<'json' | 'csv'>('json')

  const { mutate: exportData, isPending: isExportingData } =
    useExportDataMutation()
  const { mutate: exportBulk, isPending: isExportingBulk } =
    useExportBulkMutation()

  const handleExport = () => {
    exportData({ entityType: selectedEntity, format: selectedFormat })
  }

  const handleBulkExport = () => {
    exportBulk()
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 py-8">
      {/* Specific Entity Export Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Export Entity Data
          </CardTitle>
          <CardDescription>
            Download data for a specific table in CSV or JSON format.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Field className="w-fit">
            <FieldLabel>Select Entity</FieldLabel>
            <Select value={selectedEntity} onValueChange={setSelectedEntity}>
              <SelectTrigger>
                <SelectValue placeholder="Select entity to export" />
              </SelectTrigger>
              <SelectContent>
                {EXPORT_ENTITIES.map((entity) => (
                  <SelectItem key={entity.id} value={entity.id}>
                    {entity.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel>Select Format</FieldLabel>

            <ToggleGroup
              type="single"
              value={selectedFormat}
              onValueChange={(val) => {
                if (val) setSelectedFormat(val as 'json' | 'csv')
              }}
              className="justify-start"
            >
              <ToggleGroupItem
                value="csv"
                aria-label="CSV"
                onClick={() => setSelectedFormat('csv')}
              >
                CSV
              </ToggleGroupItem>
              <ToggleGroupItem
                value="json"
                aria-label="JSON"
                onClick={() => setSelectedFormat('json')}
              >
                JSON
              </ToggleGroupItem>
            </ToggleGroup>
          </Field>

          <Button
            className="w-full font-bold"
            onClick={handleExport}
            disabled={isExportingData}
          >
            {isExportingData ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export{' '}
                {EXPORT_ENTITIES.find((e) => e.id === selectedEntity)?.name}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Bulk Export Card */}
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Bulk Export
          </CardTitle>
          <CardDescription>
            Export the entire database snapshot. This process may take a while
            depending on the data size.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col justify-between h-[calc(100%-80px)]">
          <div className="text-sm text-muted-foreground space-y-4">
            <p>
              Bulk export will generate a comprehensive JSON file containing all
              entities, relations, and settings.
            </p>
            <ul className="list-disc list-inside space-y-1 ml-1">
              <li>Inventory records & Categories</li>
              <li>Machine configurations</li>
              <li>Team structures & Lab layouts</li>
              <li>Historical logs</li>
            </ul>
          </div>

          <Button
            variant="default"
            className="w-full font-bold mt-6"
            onClick={handleBulkExport}
            disabled={isExportingBulk}
          >
            {isExportingBulk ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Bulk Export...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Download Bulk Data
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
