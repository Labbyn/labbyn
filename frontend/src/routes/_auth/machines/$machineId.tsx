import { useState } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import {
  Activity,
  AlarmClock,
  ArrowDownUp,
  ArrowLeft,
  Book,
  Box,
  Cable,
  Cctv,
  Check,
  ChevronRight,
  Cpu,
  Edit2,
  FileText,
  Info,
  Lock,
  LockOpen,
  MapPin,
  MemoryStick,
  MonitorCog,
  Network,
  Save,
  StickyNote,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { machineSpecInfoQueryOptions } from '@/integrations/machines/machines.query'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { TextField } from '@/components/text-field'
import { Separator } from '@/components/ui/separator'
import { useUpdateMachineMutation } from '@/integrations/machines/machines.mutation'
import { SubPageTemplate } from '@/components/subpage-template'
import { SubpageCard } from '@/components/subpage-card'
import { TagList } from '@/components/tag-list'

export const Route = createFileRoute('/_auth/machines/$machineId')({
  component: MachineDetailsPage,
})

function MachineDetailsPage() {
  const router = useRouter()
  const { machineId } = Route.useParams()
  const { data: machine } = useSuspenseQuery(
    machineSpecInfoQueryOptions(machineId),
  )
  const updateMachine = useUpdateMachineMutation(machineId)

  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({ ...machine })

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSave = () => {
    updateMachine.mutate(formData, {
      onSuccess: () => setIsEditing(false),
    })
    setIsEditing(false)
  }

  return (
    <SubPageTemplate
      headerProps={{
        title: machine.name,
        isEditing: isEditing,
        editValue: formData.name,
        onEditChange: (val) => setFormData((prev) => ({ ...prev, name: val })),
        onSave: () => {
          updateMachine.mutate(formData, {
            onSuccess: () => setIsEditing(false),
          })
          setIsEditing(false)
        },
        onCancel: () => {
          setFormData({ ...machine })
          setIsEditing(false)
        },
        onStartEdit: () => setIsEditing(true),
        onDelete: () =>
          deleteMachine.mutate({
            onSuccess: () => {
              toast.success('Machine deleted successfully')
              router.history.back()
            },
            onError: (error: Error) => {
              toast.error('Operation failed', { description: error.message })
            },
          }),
      }}
      content={
        <>
          {/* User General info */}
          <SubpageCard
            title={'System Information'}
            description={'Core network and hardware configurations'}
            type="info"
            Icon={Info}
            content={
              <>
                {[
                  { label: 'IP Address', name: 'ip_address', icon: Network },
                  {
                    label: 'MAC Address',
                    name: 'mac_address',
                    icon: ArrowDownUp,
                  },
                  { label: 'Operating System', name: 'os', icon: MonitorCog },
                  { label: 'CPU', name: 'cpus', icon: Cpu, isList: true },
                  { label: 'RAM Memory', name: 'ram', icon: MemoryStick },
                  { label: 'Storage', name: 'disks', icon: Save, isList: true },
                  { label: 'PDU Port', name: 'pdu_port', icon: Cable },
                  {
                    label: 'Serial Number',
                    name: 'serial_number',
                    icon: FileText,
                  },
                  { label: 'Added On', name: 'added_on', icon: AlarmClock },
                  { label: 'Tags', name: 'tags', icon: Box },
                ].map((field, index, array) => {
                  const isDateField = field.name === 'added_on'
                  const isCapacityField = field.name === 'ram'
                  const rawValue = machine[field.name]

                  // Helper to format values
                  const getDisplayValue = () => {
                    if (isDateField && rawValue) {
                      return new Date(rawValue).toLocaleString('en-CA', {
                        hour12: false,
                      })
                    }
                    if (
                      isCapacityField &&
                      rawValue &&
                      !String(rawValue).includes('GB')
                    ) {
                      return `${rawValue} GB`
                    }
                    return rawValue
                  }

                  return (
                    <div
                      key={field.name}
                      className={`flex flex-col gap-1.5 py-3 ${
                        index !== array.length - 1
                          ? 'border-b border-border/50'
                          : ''
                      }`}
                    >
                      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-tight text-muted-foreground/80">
                        <field.icon className="h-3.5 w-3.5" />
                        {field.label}
                      </div>
                      <div className="flex flex-col gap-2 min-h-[32px] justify-center">
                        {isEditing && field.name !== 'added_on' ? (
                          <>
                            {field.name === 'tags' ? (
                              <TagList tags={rawValue} type="edit" />
                            ) : field.name === 'cpus' ? (
                              formData.cpus.map((cpu: any, idx: number) => (
                                <Input
                                  key={cpu.id || idx}
                                  value={cpu.name}
                                  onChange={(e) =>
                                    handleListInputChange(
                                      'cpus',
                                      idx,
                                      'name',
                                      e.target.value,
                                    )
                                  }
                                  className="h-8 text-sm"
                                  placeholder="CPU Name"
                                />
                              ))
                            ) : field.name === 'disks' ? (
                              formData.disks.map((disk: any, idx: number) => (
                                <div
                                  key={disk.id || idx}
                                  className="flex gap-2 items-center"
                                >
                                  <Input
                                    value={disk.name}
                                    onChange={(e) =>
                                      handleListInputChange(
                                        'disks',
                                        idx,
                                        'name',
                                        e.target.value,
                                      )
                                    }
                                    className="h-8 text-sm flex-1"
                                    placeholder="Disk Name"
                                  />
                                  <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-1 rounded font-bold shrink-0">
                                    {disk.capacity.includes('GB')
                                      ? disk.capacity
                                      : `${disk.capacity} GB`}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <Input
                                name={field.name}
                                value={(formData as any)[field.name]}
                                onChange={handleInputChange}
                                className="h-8 text-sm rounded-md border-input bg-background"
                              />
                            )}
                          </>
                        ) : (
                          <div className="text-sm font-medium text-foreground flex flex-col gap-1">
                            {field.name === 'cpus' ? (
                              rawValue?.map((cpu: any) => (
                                <div key={cpu.id}>{cpu.name}</div>
                              ))
                            ) : field.name === 'disks' ? (
                              rawValue?.map((disk: any) => (
                                <div
                                  key={disk.id}
                                  className="flex justify-between items-center max-w-[240px]"
                                >
                                  <span>{disk.name}</span>
                                  <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-bold">
                                    {disk.capacity.includes('GB')
                                      ? disk.capacity
                                      : `${disk.capacity} GB`}
                                  </span>
                                </div>
                              ))
                            ) : field.name === 'tags' ? (
                              <TagList tags={rawValue} />
                            ) : (
                              <span className="truncate">
                                {getDisplayValue() || '—'}
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
            description={'Rack and environment placement'}
            type="Info"
            Icon={MapPin}
            content={
              <>
                <div className="flex flex-col">
                  {[
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
              </>
            }
          />
          {/* Note */}
          <SubpageCard
            title={'Machine Notes'}
            description={
              'Useful information about machine added by team member'
            }
            type="Info"
            Icon={Book}
            content={
              <>
                {isEditing ? (
                  <TextField
                    value={formData.note ?? ''}
                    onChange={handleInputChange}
                    maxChars={500}
                  />
                ) : (
                  <div className="text-sm leading-relaxed">
                    {machine.note || (
                      <span className="italic opacity-50">
                        No notes available.
                      </span>
                    )}
                  </div>
                )}
              </>
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
                  { label: 'Monitoring', name: 'monitoring', icon: Cctv },
                  {
                    label: 'Ansible access',
                    name: 'ansible_access',
                    icon: Lock,
                  },
                  {
                    label: 'Ansible root access',
                    name: 'ansible_root_access',
                    icon: LockOpen,
                  },
                ].map((field) => {
                  const isAgentField = [
                    'monitoring',
                    'ansible_access',
                    'ansible_root_access',
                  ].includes(field.name)
                  const rawValue = (machine as any)[field.name]

                  return (
                    <div
                      key={field.name}
                      className="flex flex-col gap-1.5 py-3 border-b border-border/50 last:border-0"
                    >
                      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-tight text-muted-foreground/80">
                        <field.icon className="h-3.5 w-3.5" />
                        {field.label}
                      </div>

                      <div className="flex items-center min-h-[32px]">
                        {isEditing && !isAgentField ? (
                          <Input
                            name={field.name}
                            value={(formData as any)[field.name]}
                            onChange={handleInputChange}
                            className="h-8 text-sm rounded-md border-input bg-background"
                          />
                        ) : (
                          <div className="text-sm font-medium">
                            {isAgentField ? (
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
                            ) : (
                              <span className="text-foreground">
                                {displayValue || '—'}
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
                    },
                    {
                      label: 'Rack view',
                      sub: 'Hardware configuration',
                      to: machine.rack_link,
                    },
                    {
                      label: 'Grafana dashboard',
                      sub: 'System metrics',
                      to: machine.grafana_link,
                    },
                  ].map((item, index) => (
                    <Link
                      key={index}
                      to={item.to}
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
                    </Link>
                  ))}
                </div>
              </>
            }
          />
        </>
      }
    />
  )
}
