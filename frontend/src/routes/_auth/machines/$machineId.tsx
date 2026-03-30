import { useEffect, useState } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { useForm } from '@tanstack/react-form'
import {
  AlarmClock,
  ArrowDownUp,
  Box,
  Cable,
  Cctv,
  ChevronRight,
  Cpu,
  FileText,
  Info,
  Lock,
  LockOpen,
  MapPin,
  MemoryStick,
  MonitorCog,
  Network,
  Plus,
  Save,
  StickyNote,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import type { TagItem } from '@/integrations/tags/tags.types'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { machineSpecInfoQueryOptions } from '@/integrations/machines/machines.query'
import {
  useDeleteMachineMutation,
  useUpdateMachineMutation,
} from '@/integrations/machines/machines.mutation'
import { SubPageTemplate } from '@/components/subpage-template'
import { SubpageCard } from '@/components/subpage-card'
import { TagList } from '@/components/tag-list'
import { convertTimestampToDate } from '@/utils'
import { AutoDiscovertDialog } from '@/components/auto-discovery-dialog'
import { teamsQueryOptions } from '@/integrations/teams/teams.query'
import { labsBaseQueryOptions } from '@/integrations/labs/labs.query'
import { racksBaseListQueryOptions } from '@/integrations/racks/racks.query'
import { singleShelfQueryOptions } from '@/integrations/shelves/shelves.query'
import { useCreateShelfMutation } from '@/integrations/shelves/shelves.mutation'
import { PlatformWebsocket } from '@/components/platform-websocket'
import { MachineAgentDialog } from '@/components/machine-agent-dialog'

export const Route = createFileRoute('/_auth/machines/$machineId')({
  component: MachineDetailsPage,
})

function MachineDetailsPage() {
  const router = useRouter()
  const { machineId } = Route.useParams()
  const { data: machine } = useSuspenseQuery(
    machineSpecInfoQueryOptions(machineId),
  )
  const { data: teams } = useSuspenseQuery(teamsQueryOptions)
  const { data: labs } = useSuspenseQuery(labsBaseQueryOptions)
  const { data: racks } = useSuspenseQuery(racksBaseListQueryOptions)

  const updateMachine = useUpdateMachineMutation(machineId)
  const deleteMachine = useDeleteMachineMutation(machineId)

  const { mutate: createShelf } = useCreateShelfMutation()
  // TO DO: make shelf creation auto select the created shelf for the machine
  const handleShelfCreation = (rackId: number) => {
    const nextOrder = (shelves?.length ?? 0) + 1
    createShelf(
      {
        rackId: rackId,
        shelfData: {
          name: `Shelf ${nextOrder}`,
          order: nextOrder,
        },
      },
      {
        onSuccess: (data) => {
          console.log(data)
        },
      },
    )
  }
  const [isEditing, setIsEditing] = useState(false)

  const form = useForm({
    defaultValues: { ...machine },
    onSubmit: ({ value }) => {
      updateMachine.mutate(value, {
        onSuccess: () => {
          toast.success('Machine updated successfully')
          setIsEditing(false)
        },
        onError: (error: Error) => {
          toast.error('Update failed', { description: error.message })
        },
      })
    },
  })

  const [selectedTeam, setSelectedTeam] = useState<number | null | undefined>(
    Number(machine.team_id),
  )
  const [selectedRoom, setSelectedRoom] = useState<number | null | undefined>(
    Number(machine.room_id),
  )
  const [selectedRack, setSelectedRack] = useState<number | null | undefined>(
    Number(machine.rack_id),
  )

  useEffect(() => {
    if (isEditing) {
      setSelectedTeam(Number(machine.team_id))
      setSelectedRoom(machine.room_id)
      setSelectedRack(machine.rack_id)
      form.reset()
    }
  }, [isEditing, machine])

  const availableRooms = labs.filter(
    (lab) => Number(lab.team_id) === Number(selectedTeam),
  )

  const availableRacks = racks.filter(
    (rack) =>
      Number(rack.team_id) === Number(selectedTeam) &&
      Number(rack.room_id) === Number(selectedRoom),
  )

  const { data: shelves, isLoading: isLoadingShelves } = useQuery({
    ...(selectedRack != null
      ? singleShelfQueryOptions(String(selectedRack))
      : { queryKey: ['shelf'], queryFn: () => [] }),
    enabled: selectedRack != null,
  })
  return (
    <SubPageTemplate
      headerProps={{
        title: machine.name,
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
          deleteMachine.mutate(undefined, {
            onSuccess: () => {
              toast.success('Machine deleted successfully')
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
          {machine.monitoring && (
            <PlatformWebsocket instance={machine.ip_address} />
          )}
          <AutoDiscovertDialog
            machineId={machineId}
            machineHostname={machine.name}
          />
          <MachineAgentDialog machine={machine} />
          {/* User General info */}
          <SubpageCard
            title={'System Information'}
            description={'Core network and hardware configurations'}
            type="info"
            Icon={Info}
            content={
              <>
                {[
                  {
                    label: 'IP Address',
                    name: 'ip_address' as const,
                    icon: Network,
                  },
                  {
                    label: 'MAC Address',
                    name: 'mac_address' as const,
                    icon: ArrowDownUp,
                  },
                  {
                    label: 'Operating System',
                    name: 'os' as const,
                    icon: MonitorCog,
                  },
                  {
                    label: 'CPU',
                    name: 'cpus' as const,
                    icon: Cpu,
                    isList: true,
                  },
                  {
                    label: 'RAM Memory',
                    name: 'ram' as const,
                    icon: MemoryStick,
                  },
                  {
                    label: 'Storage',
                    name: 'disks' as const,
                    icon: Save,
                    isList: true,
                  },
                  { label: 'PDU Port', name: 'pdu_port' as const, icon: Cable },
                  {
                    label: 'Serial Number',
                    name: 'serial_number' as const,
                    icon: FileText,
                  },
                  {
                    label: 'Added On',
                    name: 'added_on' as const,
                    icon: AlarmClock,
                  },
                  { label: 'Tags', name: 'tags' as const, icon: Box },
                ].map((formFiled, idx, array) => {
                  const rawValue = machine[formFiled.name]

                  return (
                    <div
                      key={formFiled.name}
                      className={`flex flex-col gap-1.5 py-3 ${
                        idx !== array.length - 1
                          ? 'border-b border-border/50'
                          : ''
                      }`}
                    >
                      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-tight text-muted-foreground/80">
                        <formFiled.icon className="h-3.5 w-3.5" />
                        {formFiled.label}
                      </div>
                      <div className="flex flex-col gap-2 min-h-8 justify-center">
                        {isEditing ? (
                          <>
                            {formFiled.name === 'tags' ? (
                              <TagList
                                tags={rawValue as Array<TagItem>}
                                type="edit"
                                entityType="machine"
                                entityId={machineId}
                              />
                            ) : formFiled.name === 'cpus' ? (
                              <form.Field
                                name="cpus"
                                children={(field) => {
                                  const cpus = field.state.value
                                  return (
                                    <div className="space-y-2">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="w-fit"
                                        onClick={() =>
                                          field.handleChange([
                                            ...cpus,
                                            {
                                              id: 0,
                                              machine_id: Number(machineId),
                                              name: '',
                                            },
                                          ])
                                        }
                                      >
                                        <Plus className="h-4 w-4 mr-2" /> Add
                                        CPU
                                      </Button>
                                      {cpus.map((cpu, index) => (
                                        <div
                                          key={cpu.id || index}
                                          className="flex gap-2 items-center"
                                        >
                                          <Input
                                            value={cpu.name || ''}
                                            onChange={(e) => {
                                              const newCpus = [...cpus]
                                              newCpus[index] = {
                                                ...newCpus[index],
                                                name: e.target.value,
                                              }
                                              field.handleChange(newCpus)
                                            }}
                                            className="h-8 text-sm flex-1"
                                            placeholder="CPU Name"
                                          />
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() =>
                                              field.handleChange(
                                                cpus.filter(
                                                  (_: any, i: number) =>
                                                    i !== index,
                                                ),
                                              )
                                            }
                                          >
                                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  )
                                }}
                              />
                            ) : formFiled.name === 'disks' ? (
                              <form.Field
                                name="disks"
                                children={(field) => {
                                  const disks = field.state.value
                                  return (
                                    <div className="space-y-2">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="w-fit"
                                        onClick={() =>
                                          field.handleChange([
                                            ...disks,
                                            {
                                              id: 0,
                                              machine_id: Number(machineId),
                                              name: '',
                                              capacity: '',
                                            },
                                          ])
                                        }
                                      >
                                        <Plus className="h-4 w-4 mr-2" /> Add
                                        Disk
                                      </Button>
                                      {disks.map((disk: any, index: number) => (
                                        <div
                                          key={disk.id || index}
                                          className="flex gap-2 items-center"
                                        >
                                          <Input
                                            value={disk.name || ''}
                                            onChange={(e) => {
                                              const newDisks = [...disks]
                                              newDisks[index] = {
                                                ...newDisks[index],
                                                name: e.target.value,
                                              }
                                              field.handleChange(newDisks)
                                            }}
                                            className="h-8 text-sm flex-1"
                                            placeholder="Disk Name"
                                          />
                                          <Input
                                            value={disk.capacity}
                                            type="number"
                                            onChange={(e) => {
                                              const newDisks = [...disks]
                                              newDisks[index] = {
                                                ...newDisks[index],
                                                capacity: e.target.value,
                                              }
                                              field.handleChange(newDisks)
                                            }}
                                            className="h-8 text-sm flex-1"
                                            placeholder="Capacity"
                                          />
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() =>
                                              field.handleChange(
                                                disks.filter(
                                                  (_: any, i: number) =>
                                                    i !== index,
                                                ),
                                              )
                                            }
                                          >
                                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  )
                                }}
                              />
                            ) : formFiled.name === 'added_on' ? (
                              <span className="truncate">
                                {typeof rawValue === 'string' ||
                                typeof rawValue === 'number'
                                  ? rawValue
                                  : '—'}
                              </span>
                            ) : (
                              <form.Field
                                name={formFiled.name as any}
                                children={(field) => (
                                  <Input
                                    value={String(field.state.value)}
                                    onChange={(e) =>
                                      field.handleChange(e.target.value as any)
                                    }
                                    className="h-8 text-sm rounded-md border-input bg-background"
                                  />
                                )}
                              />
                            )}
                          </>
                        ) : (
                          <div className="text-sm font-medium text-foreground flex flex-col gap-1">
                            {formFiled.name === 'cpus' &&
                            Array.isArray(rawValue) ? (
                              rawValue.map((cpu: any) => (
                                <div key={cpu.id}>{cpu.name}</div>
                              ))
                            ) : formFiled.name === 'disks' &&
                              Array.isArray(rawValue) ? (
                              rawValue.map((disk: any) => (
                                <div
                                  key={disk.id}
                                  className="flex justify-between items-center max-w-60"
                                >
                                  <span>{disk.name}</span>
                                  <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-bold">
                                    {disk.capacity}
                                  </span>
                                </div>
                              ))
                            ) : formFiled.name === 'tags' ? (
                              <TagList tags={rawValue as Array<TagItem>} />
                            ) : formFiled.name === 'added_on' ? (
                              <span className="truncate">
                                {convertTimestampToDate(rawValue as string) ||
                                  '—'}
                              </span>
                            ) : (
                              <span className="truncate">
                                {typeof rawValue === 'string' ||
                                typeof rawValue === 'number'
                                  ? rawValue
                                  : '—'}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </>
            }
          />
          {/* Localization section */}
          <SubpageCard
            title={'Localization'}
            description={'Platfrom localization details'}
            type="Info"
            Icon={MapPin}
            content={
              <div className="flex flex-col gap-4">
                {isEditing ? (
                  <div className="flex flex-col gap-4 py-2">
                    {/* Team Selection */}
                    <form.Field
                      name="team_id"
                      children={(field) => (
                        <>
                          <Select
                            value={field.state.value?.toString() ?? ''}
                            onValueChange={(value) => {
                              field.handleChange(Number(value) as any)
                              setSelectedTeam(Number(value))

                              setSelectedRoom(undefined)
                              setSelectedRack(undefined)
                              form.setFieldValue('room_id', null)
                              form.setFieldValue('rack_id', null)
                              form.setFieldValue('shelf_id', null)
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
                        </>
                      )}
                    />

                    {/* Room / Lab Selection */}
                    <form.Field
                      name="room_id"
                      children={(field) => (
                        <>
                          <Select
                            disabled={selectedTeam == null}
                            value={field.state.value?.toString() ?? ''}
                            onValueChange={(value) => {
                              field.handleChange(Number(value))
                              setSelectedRoom(Number(value))
                              setSelectedRack(undefined)
                              form.setFieldValue('rack_id', null)
                              form.setFieldValue('shelf_id', null)
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue
                                placeholder={
                                  selectedTeam == null
                                    ? 'Select a Team first'
                                    : availableRooms.length === 0
                                      ? 'No rooms for this team'
                                      : 'Select a lab'
                                }
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {availableRooms.map((lab) => (
                                <SelectItem
                                  key={lab.id}
                                  value={lab.id.toString()}
                                >
                                  {lab.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </>
                      )}
                    />

                    {/* Rack Selection */}
                    <form.Field
                      name="rack_id"
                      children={(field) => (
                        <>
                          <Select
                            disabled={selectedRoom == null}
                            value={field.state.value?.toString() ?? ''}
                            onValueChange={(value) => {
                              field.handleChange(Number(value))
                              setSelectedRack(Number(value))
                              form.setFieldValue('shelf_id', null)
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue
                                placeholder={
                                  selectedRoom == null
                                    ? 'Select a Room first'
                                    : availableRacks.length === 0
                                      ? 'No racks available'
                                      : 'Select a rack'
                                }
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {availableRacks.map((rack) => (
                                <SelectItem
                                  key={rack.id}
                                  value={rack.id.toString()}
                                >
                                  {rack.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </>
                      )}
                    />
                    {/* Shelf Selection */}
                    <form.Field
                      name="shelf_id"
                      children={(field) => (
                        <>
                          <Select
                            disabled={selectedRack == null}
                            value={field.state.value?.toString() ?? ''}
                            onValueChange={(value) => {
                              if (value === 'new') {
                                handleShelfCreation(Number(selectedRack))
                                return
                              }
                              field.handleChange(Number(value))
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue
                                placeholder={
                                  selectedRack == null
                                    ? 'Select a Rack first'
                                    : isLoadingShelves
                                      ? 'Loading shelves...'
                                      : 'Select a shelf'
                                }
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {isLoadingShelves && field.state.value && (
                                <SelectItem
                                  value={field.state.value.toString()}
                                >
                                  Shelf #{machine.shelf_number}
                                </SelectItem>
                              )}
                              {shelves
                                ?.sort((a, b) => a.order - b.order)
                                .map((shelf) => (
                                  <SelectItem
                                    key={shelf.id}
                                    value={shelf.id.toString()}
                                  >
                                    Shelf #{shelf.order}
                                  </SelectItem>
                                ))}
                              <SelectItem value="new">
                                <div className="flex items-center gap-2">
                                  <Plus className="h-3.5 w-3.5" />
                                  <span>Add new shelf...</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </>
                      )}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col">
                    {[
                      { label: 'Team', value: machine.team_name },
                      { label: 'Room name', value: machine.room_name },
                      { label: 'Rack name', value: machine.rack_name },
                      { label: 'Shelf number', value: machine.shelf_number },
                    ].map((item, index, array) => (
                      <div
                        key={item.label}
                        className={`flex flex-col gap-1.5 py-3 ${
                          index !== array.length - 1
                            ? 'border-b border-border/50'
                            : ''
                        }`}
                      >
                        <span className="text-[11px] font-bold uppercase tracking-tight text-muted-foreground/80">
                          {item.label}
                        </span>
                        <span className="text-sm font-medium text-foreground">
                          {item.value || '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            }
          />
          {/* Monitoring */}
          <SubpageCard
            title={'Monitoring'}
            description={'All information about machine telemetry'}
            type="Info"
            Icon={StickyNote}
            content={
              <>
                {[
                  {
                    label: 'Monitoring',
                    name: 'monitoring' as const,
                    icon: Cctv,
                  },
                  {
                    label: 'Ansible access',
                    name: 'ansible_access' as const,
                    icon: Lock,
                  },
                  {
                    label: 'Ansible root access',
                    name: 'ansible_root_access' as const,
                    icon: LockOpen,
                  },
                ].map((field) => {
                  const rawValue = machine[field.name]

                  return (
                    <div
                      key={field.name}
                      className="flex flex-col gap-1.5 py-3 border-b border-border/50 last:border-0"
                    >
                      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-tight text-muted-foreground/80">
                        <field.icon className="h-3.5 w-3.5" />
                        {field.label}
                      </div>

                      <div className="flex items-center min-h-8">
                        <div className="text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <div
                              className={`h-2 w-2 rounded-full ${rawValue ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`}
                            />
                            <span
                              className={
                                rawValue
                                  ? 'text-foreground'
                                  : 'text-muted-foreground'
                              }
                            >
                              {rawValue ? 'Active' : 'Not Active'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </>
            }
          />

          {/* Links */}
          <SubpageCard
            title={'Machine links'}
            description={
              'Useful information about machine added by team member'
            }
            type="Info"
            Icon={Cable}
            content={
              <>
                <div className="flex flex-col gap-3">
                  {[
                    {
                      label: 'Map view',
                      sub: 'Location details',
                      to: machine.map_link,
                      condition: machine.rack_id != null,
                    },
                    {
                      label: 'Rack view',
                      sub: 'Hardware configuration',
                      to: machine.rack_link,
                      condition: machine.rack_id != null,
                    },
                    {
                      label: 'Grafana dashboard',
                      sub: 'System metrics',
                      to: machine.grafana_link,
                      condition: machine.monitoring,
                    },
                  ].map((item, index) => {
                    const isExternal = item.to.startsWith('http')
                    const Component = isExternal ? 'a' : Link

                    const extraProps = isExternal
                      ? { href: item.to, target: '_blank', rel: 'noreferrer' }
                      : { to: item.to }
                    if (item.condition) {
                      return (
                        <Component
                          key={index}
                          {...(extraProps as any)}
                          className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent hover:text-accent-foreground transition-colors group"
                        >
                          <div className="flex flex-col gap-1">
                            <span className="font-bold text-sm tracking-tight">
                              {item.label}
                            </span>
                            <span className="text-[10px] text-muted-foreground uppercase font-semibold opacity-70">
                              {item.sub}
                            </span>
                          </div>

                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                        </Component>
                      )
                    } else {
                      return null
                    }
                  })}
                </div>
              </>
            }
          />
        </>
      }
    />
  )
}
