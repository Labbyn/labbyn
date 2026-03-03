import { createFileRoute } from '@tanstack/react-router'
import { FolderInput } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import ImportTab from '@/components/import-export/import-tab'
import { ExportTab } from '@/components/import-export/export-tab'
import { PageHeader } from '@/components/page-header'

export const Route = createFileRoute('/_auth/import-export')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Import & Export"
        description="Import and export data to/from .csv file"
        icon={FolderInput}
      />
      <Separator />
      <Tabs defaultValue="import">
        <TabsList>
          <TabsTrigger value="import">Import Data</TabsTrigger>
          <TabsTrigger value="export">Export Data</TabsTrigger>
        </TabsList>
        <TabsContent value="import">
          <ImportTab />
        </TabsContent>
        <TabsContent value="export">
          <ExportTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
