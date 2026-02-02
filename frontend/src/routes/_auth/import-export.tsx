import { createFileRoute } from '@tanstack/react-router'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import ImportTab from '@/components/import-export/import-tab'
import { ExportTab } from '@/components/import-export/export-tab'

export const Route = createFileRoute('/_auth/import-export')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="p-6 flex flex-col gap-6">
      <article className="prose prose-neutral dark:prose-invert">
        <h2>Import & Export</h2>
        Bulk import or export your records for backup or analysis
      </article>
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
