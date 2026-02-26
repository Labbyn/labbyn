import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { ArrowLeft, Box, Cpu, Server, Users } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import { singleRackQueryOptions } from '@/integrations/racks/racks.query'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { DataTableColumnHeader } from '@/components/data-table/column-header'
import { Separator } from '@/components/ui/separator'

export const Route = createFileRoute('/_auth/racks/$racksId')({
  component: RacksDetailsPage,
})


function RacksDetailsPage() {
  const router = useRouter()
  const { racksId } = Route.useParams()
  const { data: rack } = useSuspenseQuery(singleRackQueryOptions(racksId))

  // Api returns machines in 2D array, it helps determine machines on the same shelf
  // For now based on requierments we don't need to specify shelf
  const flatMachines = rack.machines.flat()
  const columnsMachines: Array<ColumnDef<any>> = [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Machine Name" />
      ),
    },
    {
      accessorKey: 'ip_address',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="IP address" />
      ),
    },
    {
      accessorKey: 'mac_address',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="MAC address" />
      ),
    }
  ]

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-background">
      <div className="flex items-center gap-4 bg-background/95 px-6 py-4 backdrop-blur z-10 shrink-0">
        <Button
          onClick={() => router.history.back()}
          variant="ghost"
          size="icon"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-bold tracking-tight">{rack.name}</h1>
            <p className="text-muted-foreground text-sm">
              Team administrator: 
            </p>
          </div>
        </div>
      </div>
      <Separator />
      <ScrollArea className="h-full bg-slate-50/50 dark:bg-zinc-950/50">
        <div className="p-8 max-w-[1600px] mx-auto space-y-8">
          {/* Main Content Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Machines Section - Full Width for large tables */}
            <section className="lg:col-span-2 bg-card rounded-xl border shadow-sm flex flex-col overflow-hidden">
              <div className="px-6 py-4 border-b bg-muted/30 flex justify-between items-center">
                <h2 className="font-semibold text-lg flex items-center gap-2">
                  <Cpu className="h-5 w-5 text-primary" /> Machines & Platforms
                </h2>
                <span className="text-xs font-medium bg-primary/10 text-primary px-2.5 py-0.5 rounded-full">
                  {rack.machines.length} Total
                </span>
              </div>
              <div className="p-1">
                <DataTable columns={columnsMachines} data={flatMachines} />
              </div>
            </section>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
