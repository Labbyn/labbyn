import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useForm } from '@tanstack/react-form'
import { Box, Cpu, Info, Users } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import type { ColumnDef } from '@tanstack/react-table'
import type { TagItem } from '@/integrations/tags/tags.types'
import { singleRackQueryOptions } from '@/integrations/racks/racks.query'
import { DataTable } from '@/components/ui/data-table'
import { DataTableColumnHeader } from '@/components/data-table/column-header'
import { TagList } from '@/components/tag-list'
import { teamsQueryOptions } from '@/integrations/teams/teams.query'
import { SubPageTemplate } from '@/components/subpage-template'
import { DndTable } from '@/components/dnd/dnd-table'
import { SubpageCard } from '@/components/subpage-card'
import {
  useDeletRackMutation,
  useUpdateRackMutation,
} from '@/integrations/racks/racks.mutation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export const Route = createFileRoute('/_auth/racks/$racksId')({
  component: RacksDetailsPage,
})

function RacksDetailsPage() {
  const { racksId } = Route.useParams()
  const router = useRouter()
  const deleteRack = useDeletRackMutation(Number(racksId))
  const updateRack = useUpdateRackMutation(Number(racksId))
  const { data: rack } = useSuspenseQuery(singleRackQueryOptions(racksId))
  const { data: teams } = useSuspenseQuery(teamsQueryOptions)
  const [isEditing, setIsEditing] = useState(false)
  const navigate = useNavigate()

  const form = useForm({
    defaultValues: {
      name: rack.name,
      team_id: rack.team_id,
      room_id: rack.room_id,
      tags: rack.tags,
      shelves: rack.shelves,
    },
    onSubmit: ({ value }) => {
      updateRack.mutate(value, {
        onSuccess: () => {
          toast.success('Rack updated successfully')
          setIsEditing(false)
        },
        onError: (error: Error) => {
          toast.error('Operation failed', { description: error.message })
        },
      })
      setIsEditing(false)
    },
  })

  // Api returns machines in 2D array, it helps determine machines on the same shelf
  // For table we don't need nested structure
  const flatMachines = rack.shelves.flatMap((shelf) => shelf.machines)

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
        editValue: form.state.values.name,
        onEditChange: (val) => form.setFieldValue('name', val),
        onSave: (e) => {
          e.preventDefault()
          form.handleSubmit()
        },
        onCancel: () => {
          form.reset()
          setIsEditing(false)
        },
        onStartEdit: () => setIsEditing(true),
        onDelete: () => {
          deleteRack.mutate(undefined, {
            onSuccess: () => {
              toast.success('Rack deleted successfully')
              router.history.back()
            },
            onError: (error: Error) => {
              toast.error('Operation failed', { description: error.message })
            },
          })
        },
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
                          <form.Field
                            name="tags"
                            children={() => (
                              <TagList
                                tags={fieldValue as Array<TagItem>}
                                type="edit"
                                entityType="rack"
                                entityId={racksId}
                              />
                            )}
                          />
                        ) : (
                          <form.Field
                            name="team_id"
                            children={(formField) => (
                              <Select
                                value={formField.state.value.toString()}
                                onValueChange={(value) => {
                                  formField.handleChange(Number(value))
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a team" />
                                </SelectTrigger>
                                <SelectContent>
                                  {teams.map((team) => (
                                    <SelectItem
                                      key={team.id}
                                      value={team.id.toString()}
                                    >
                                      {team.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                        )
                      ) : field.name === 'tags' ? (
                        <TagList
                          tags={fieldValue as Array<TagItem>}
                          entityType="rack"
                          entityId={racksId}
                        />
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
                  <form.Field
                    name="shelves"
                    children={(field) => (
                      <DndTable
                        shelves={field.state.value}
                        onReorder={(newShelves) => {
                          field.handleChange(newShelves)
                        }}
                      />
                    )}
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
