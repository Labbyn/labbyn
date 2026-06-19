import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useForm } from '@tanstack/react-form'
import { Box, Cpu, Info, Layers, MapPin, Users } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import type { ColumnDef } from '@tanstack/react-table'
import type { TagItem } from '@/integrations/tags/tags.types'
import type { ApiRackDetailMachineItem } from '@/integrations/racks/racks.types'
import { singleRackQueryOptions } from '@/integrations/racks/racks.query'
import { DataTable } from '@/components/ui/data-table'
import { DataTableColumnHeader } from '@/components/data-table/column-header'
import { TagList } from '@/components/tag-list'
import { teamsQueryOptions } from '@/integrations/teams/teams.query'
import { SubPageTemplate } from '@/components/subpage-template'
import { DndTable } from '@/components/dnd/dnd-table'
import { SubpageCard } from '@/components/subpage-card'
import { ShowOnMapButton } from '@/components/map/show-on-map-button'
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
import { Button } from '@/components/ui/button'
import {
  useCreateShelfMutation,
  useDeleteShelfMutation,
  useUpdateShelvesOrderMutation,
} from '@/integrations/shelves/shelves.mutation'

export const Route = createFileRoute('/_auth/racks/$racksId')({
  component: RacksDetailsPage,
})

function RacksDetailsPage() {
  const { racksId } = Route.useParams()
  const router = useRouter()
  const deleteRack = useDeletRackMutation(Number(racksId))
  const updateRack = useUpdateRackMutation(Number(racksId))
  const createShelf = useCreateShelfMutation()
  const deleteShelf = useDeleteShelfMutation()
  const { data: rack } = useSuspenseQuery(singleRackQueryOptions(racksId))
  const { data: teams } = useSuspenseQuery(teamsQueryOptions)
  const [isEditing, setIsEditing] = useState(false)
  const navigate = useNavigate()

  const updateShelvesOrder = useUpdateShelvesOrderMutation(racksId)

  const form = useForm({
    defaultValues: {
      name: rack.name,
      team_id: rack.team_id,
      room_id: rack.room_id,
      tags: rack.tags,
      shelves: rack.shelves.slice().sort((a: any, b: any) => a.order - b.order),
    },
    onSubmit: ({ value }) => {
      // Update rack basic fields
      updateRack.mutate(value, {
        onSuccess: () => {
          toast.success('Rack updated successfully')
          setIsEditing(false)
        },
        onError: (error: Error) => {
          toast.error('Operation failed', { description: error.message })
        },
      })

      if (value.shelves && Array.isArray(value.shelves)) {
        const updates = value.shelves.map((shelf: any) => ({
          id: shelf.id,
          order: shelf.order,
        }))
        updateShelvesOrder.mutate(updates, {
          onSuccess: () => {
            toast.success('Shelves order saved')
          },
          onError: (error: Error) => {
            toast.error('Failed to save shelves order', {
              description: error.message,
            })
          },
        })
      }

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

  const columnsShelves: Array<ColumnDef<any>> = [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Shelf Name" />
      ),
    },
    {
      accessorKey: 'machines',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Machines" />
      ),
      cell: ({ row }) => {
        const machines: Array<ApiRackDetailMachineItem> =
          row.getValue('machines')

        if (machines.length === 0)
          return (
            <span className="text-muted-foreground text-sm">No machines</span>
          )

        return (
          <div className="flex flex-wrap gap-1">
            {machines.map((machine, index) => (
              <span
                key={index}
                className="text-sm font-semibold truncate flex items-center ml-2 bg-card text-card-foreground border rounded-sm px-3 py-1.5 min-w-[120px]"
              >
                {machine.name}
              </span>
            ))}
          </div>
        )
      },
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
                  {
                    label: 'Localization',
                    name: 'room_name' as const,
                    icon: MapPin,
                  },
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
                        ) : field.name === 'team_name' ? (
                          <form.Field
                            name="team_id"
                            children={(formField) => (
                              <Select
                                value={formField.state.value.toString() || ''}
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
                        ) : (
                          <span className="font-medium">
                            {fieldValue ? fieldValue.toString() : '—'}
                          </span>
                        )
                      ) : field.name === 'tags' ? (
                        <TagList
                          tags={fieldValue as Array<TagItem>}
                          entityType="rack"
                          entityId={racksId}
                        />
                      ) : field.name === 'room_name' ? (
                        <div className="flex items-center gap-3">
                          <span className="font-medium">
                            {fieldValue ? fieldValue.toString() : '—'}
                          </span>
                          <ShowOnMapButton
                            type="lab"
                            roomId={rack.room_id}
                            equipmentId={rack.id}
                            variant="secondary"
                          />
                        </div>
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
              </>
            }
          />
          {/* Shelves Section */}
          <SubpageCard
            title={'Shelves'}
            description={'Shelves with associated machines'}
            type="table"
            Icon={Layers}
            content={
              <>
                {isEditing ? (
                  <>
                    <Button
                      type="button"
                      onClick={() => {
                        const currentShelves = form.getFieldValue('shelves')
                        const highestOrder =
                          currentShelves.length > 0
                            ? Math.max(
                                ...currentShelves.map((shelf) => shelf.order),
                              )
                            : 0
                        const nextOrder = highestOrder + 1
                        createShelf.mutate(
                          {
                            rackId: Number(racksId),
                            shelfData: {
                              name: `Shelf ${nextOrder}`,
                              order: nextOrder,
                            },
                          },
                          {
                            onSuccess: (newShelf) => {
                              form.setFieldValue('shelves', [
                                ...currentShelves,
                                newShelf.data,
                              ])
                              toast.success(`Shelf ${nextOrder} added!`)
                            },
                          },
                        )
                      }}
                    >
                      Add new shelf
                    </Button>
                    <form.Field
                      name="shelves"
                      children={(field) => (
                        <DndTable
                          shelves={field.state.value.slice().sort((a: any, b: any) => a.order - b.order)}
                          onReorder={(newShelves) => {
                            field.handleChange(newShelves)
                          }}
                          onDelete={(shelfId) => {
                            deleteShelf.mutate(
                              { shelfId },
                              {
                                onSuccess: () => {
                                  const currentShelves =
                                    form.getFieldValue('shelves')
                                  form.setFieldValue(
                                    'shelves',
                                    currentShelves.filter(
                                      (shelf) => shelf.id !== shelfId,
                                    ),
                                  )
                                  toast.success(`Shelf deleted!`)
                                },
                              onError: (error: Error) => {
                                toast.error('Operation failed', { description: error.message })
                              },
                            },
                          )
                          }}
                        />
                      )}
                    />
                  </>
                ) : (
                  <DataTable
                    columns={columnsShelves}
                    data={rack.shelves.slice().sort((a, b) => a.order - b.order).map((shelf) => ({
                      name: shelf.name,
                      machines: shelf.machines,
                    }))}
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
