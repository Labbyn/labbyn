import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { ArrowLeft, Box, Cpu, Info, Server, Users } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import type { ColumnDef } from '@tanstack/react-table'
import { singleRackQueryOptions } from '@/integrations/racks/racks.query'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { DataTableColumnHeader } from '@/components/data-table/column-header'
import { Separator } from '@/components/ui/separator'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { TagList } from '@/components/tag-list'
import { SubpageHeader } from '@/components/subpage-header'
import { teamsQueryOptions } from '@/integrations/teams/teams.query'
import { InputChecklist } from '@/components/input-checklist'
import { SubPageTemplate } from '@/components/subpage-template'
import { DndTable } from '@/components/dnd/dnd-table'

export const Route = createFileRoute('/_auth/racks/$racksId')({
  component: RacksDetailsPage,
})

function RacksDetailsPage() {
  const router = useRouter()
  const { racksId } = Route.useParams()
  const { data: rack } = useSuspenseQuery(singleRackQueryOptions(racksId))
  const { data: teams } = useSuspenseQuery(teamsQueryOptions)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({ ...rack })

  // Api returns machines in 2D array, it helps determine machines on the same shelf
  // For table we don't need nested structure
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
    },
  ]

  return (
    <SubPageTemplate
      headerProps={{
        title: rack.name,
        isEditing: isEditing,
        editValue: formData.name,
        onEditChange: (val) => setFormData((prev) => ({ ...prev, name: val })),
        onSave: () => {
          updateRack.mutate(formData, {
            onSuccess: () => setIsEditing(false),
          })
          setIsEditing(false)
        },
        onCancel: () => {
          setFormData({ ...rack })
          setIsEditing(false)
        },
        onStartEdit: () => setIsEditing(true),
        onDelete: () =>
          deleteRack.mutate({
            onSuccess: () => {
              toast.success('Rack deleted successfully')
              router.history.back()
            },
            onError: (error: Error) => {
              toast.error('Operation failed', { description: error.message })
            },
          }),
      }}
      content={
        <>
          {/* Rack Info */}
          <Card className="md:col-span-3 pt-0">
            <div className="px-6 py-4 border-b bg-muted/30 flex justify-between items-center">
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" /> Rack inforamtions
              </h2>
            </div>

            <CardContent className="grid gap-6 sm:grid-cols-2">
              {[
                { label: 'Team', name: 'team_name', icon: Users },
                { label: 'Tags', name: 'tags', icon: Box },
              ].map((field) => {
                const fieldValue = rack[field.name]
                return (
                  <div key={field.name} className="grid gap-2">
                    <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <field.icon className="h-5 w-5" /> {field.label}
                    </span>
                    {isEditing ? (
                      field.name === 'tags' ? (
                        <span className="text-sm italic text-muted-foreground">
                          Tag editing requires a custom selector
                        </span>
                      ) : (
                        <InputChecklist
                          subpageItem={teams}
                          inputChangeTarget="team_name"
                          formData={formData}
                          setFormData={setFormData}
                        />
                      )
                    ) : field.name === 'tags' ? (
                      <TagList tags={fieldValue} />
                    ) : (
                      <span className="font-medium">
                        {fieldValue ? fieldValue.toString() : '—'}
                      </span>
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>
          {/* Machines Section */}
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
              {isEditing ? (
                <DndTable dbItems={rack.machines} />
              ) : (
                <DataTable columns={columnsMachines} data={flatMachines} />
              )}
            </div>
          </section>
        </>
      }
    />
  )
}
