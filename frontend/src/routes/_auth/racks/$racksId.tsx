import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Box, Cpu, Info, Users } from 'lucide-react'
import { useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import type { ApiRackDetailMachineItem } from '@/integrations/racks/racks.types'
import type { TagItem } from '@/integrations/tags/tags.types'
import { singleRackQueryOptions } from '@/integrations/racks/racks.query'
import { DataTable } from '@/components/ui/data-table'
import { DataTableColumnHeader } from '@/components/data-table/column-header'
import { TagList } from '@/components/tag-list'
import { teamsQueryOptions } from '@/integrations/teams/teams.query'
import { InputChecklist } from '@/components/input-checklist'
import { SubPageTemplate } from '@/components/subpage-template'
import { DndTable } from '@/components/dnd/dnd-table'
import { SubpageCard } from '@/components/subpage-card'

export const Route = createFileRoute('/_auth/racks/$racksId')({
  component: RacksDetailsPage,
})

function RacksDetailsPage() {
  const { racksId } = Route.useParams()
  const { data: rack } = useSuspenseQuery(singleRackQueryOptions(racksId))
  const { data: teams } = useSuspenseQuery(teamsQueryOptions)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({ ...rack })
  const navigate = useNavigate()

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
        type: 'editable',
        isEditing: isEditing,
        editValue: formData.name,
        onEditChange: (val) => setFormData((prev) => ({ ...prev, name: val })),
        onSave: () => {
          // updateRack.mutate(formData, {
          //  onSuccess: () => setIsEditing(false),
          // })
          setIsEditing(false)
        },
        onCancel: () => {
          setFormData({ ...rack })
          setIsEditing(false)
        },
        onStartEdit: () => setIsEditing(true),
        onDelete: () =>
          // deleteRack.mutate({
          //  onSuccess: () => {
          //    toast.success('Rack deleted successfully')
          //    router.history.back()
          //  },
          //  onError: (error: Error) => {
          //    toast.error('Operation failed', { description: error.message })
          //  },
          // }),
          setIsEditing(false),
      }}
      content={
        <>
          {/* Racks Section */}
          <SubpageCard
            title={'Rack informations'}
            description={'General rack informations'}
            type="info"
            Icon={Info}
            content={
              <>
                {' '}
                {[
                  { label: 'Team', name: 'team_name' as const, icon: Users },
                  { label: 'Tags', name: 'tags' as const, icon: Box },
                ].map((field) => {
                  const fieldValue = rack[field.name]
                  return (
                    <div key={field.name} className="grid gap-2">
                      <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <field.icon className="h-5 w-5" /> {field.label}
                      </span>
                      {isEditing ? (
                        field.name === 'tags' ? (
                          <TagList
                            tags={fieldValue as Array<TagItem>}
                            type="edit"
                          />
                        ) : (
                          <InputChecklist
                            items={teams}
                            value={formData.team_name}
                            onChange={(newTeamName: string) =>
                              setFormData((prev) => ({
                                ...prev,
                                team_name: newTeamName,
                              }))
                            }
                          />
                        )
                      ) : field.name === 'tags' ? (
                        <TagList tags={fieldValue as Array<TagItem>} />
                      ) : (
                        <span className="font-medium">
                          {fieldValue ? fieldValue.toString() : '—'}
                        </span>
                      )}
                    </div>
                  )
                })}
              </>
            }
          />
          {/* Machines Section */}
          <SubpageCard
            title={'Machines'}
            description={'Rack machines in order'}
            type="table"
            Icon={Cpu}
            content={
              <>
                {isEditing ? (
                  <DndTable
                    dbItems={rack.machines}
                    onReorder={(
                      newMachines: Array<Array<ApiRackDetailMachineItem>>,
                    ) => {
                      setFormData((prev) => ({
                        ...prev,
                        machines: newMachines,
                      }))
                    }}
                  />
                ) : (
                  <DataTable
                    columns={columnsMachines}
                    data={flatMachines}
                    onRowClick={(row) => {
                      navigate({
                        to: '/machines/$machineId',
                        params: { machineId: String(row.id) },
                      })
                    }}
                  />
                )}
              </>
            }
          />
        </>
      }
    />
  )
}
