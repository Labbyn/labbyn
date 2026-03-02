import { useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import {
  AlarmClock,
  ArrowDownUp,
  Book,
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
  Save,
  StickyNote,
  Users,
} from 'lucide-react'
import type { TagItem } from '@/integrations/tags/tags.types'
import { InputChecklist } from '@/components/input-checklist'
// import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { machineSpecInfoQueryOptions } from '@/integrations/machines/machines.query'
import { TextField } from '@/components/text-field'
import { useUpdateMachineMutation } from '@/integrations/machines/machines.mutation'
import { SubPageTemplate } from '@/components/subpage-template'
import { SubpageCard } from '@/components/subpage-card'
import { TagList } from '@/components/tag-list'
import { addTextToString, convertTimestampToDate } from '@/utils'
import { AutoDiscovertDialog } from '@/components/auto-discovery-dialog'
import { teamsQueryOptions } from '@/integrations/teams/teams.query'

export const Route = createFileRoute('/_auth/machines/$machineId')({
  component: MachineDetailsPage,
})

function MachineDetailsPage() {
  const { machineId } = Route.useParams()
  const { data: machine } = useSuspenseQuery(
    machineSpecInfoQueryOptions(machineId),
  )
  const { data: teams } = useSuspenseQuery(teamsQueryOptions)
  const updateMachine = useUpdateMachineMutation(machineId)

  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({ ...machine })

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleListInputChange = (
    field: string,
    index: number,
    key: string,
    value: string,
  ) => {
    setFormData((prev) => {
      const list = [...(prev[field as keyof typeof prev] as Array<any>)]
      list[index] = { ...list[index], [key]: value }
      return { ...prev, [field]: list }
    })
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
        type: 'editable',
        isEditing: isEditing,
        editValue: formData.name,
        onEditChange: (val) => setFormData((prev) => ({ ...prev, name: val })),
        onSave: () => handleSave,
        onCancel: () => {
          setFormData({ ...machine })
          setIsEditing(false)
        },
        onStartEdit: () => setIsEditing(true),
        onDelete: () => {},
        // deleteMachine.mutate({
        //  onSuccess: () => {
        //    toast.success('Machine deleted successfully')
        //    router.history.back()
        //  },
        //  onError: (error: Error) => {
        //    toast.error('Operation failed', { description: error.message })
        //  },
        // }),
      }}
      content={
        <>
          <AutoDiscovertDialog
            machineId={machineId}
            machineHostname={machine.name}
          />
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
                  { label: 'Team', name: 'team_name' as const, icon: Users },
                ].map((field, index, array) => {
                  const rawValue = machine[field.name]

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
                      <div className="flex flex-col gap-2 min-h-8 justify-center">
                        {isEditing ? (
                          <>
                            {field.name === 'tags' ? (
                              <TagList
                                tags={rawValue as Array<TagItem>}
                                type="edit"
                              />
                            ) : field.name === 'team_name' ? (
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
                                    {addTextToString(disk.capacity, 'GB')}
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
                            {field.name === 'cpus' &&
                            Array.isArray(rawValue) ? (
                              rawValue.map((cpu: any) => (
                                <div key={cpu.id}>{cpu.name}</div>
                              ))
                            ) : field.name === 'disks' &&
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
                            ) : field.name === 'tags' ? (
                              <TagList tags={rawValue as Array<TagItem>} />
                            ) : field.name === 'added_on' ? (
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
                  ].map((item, index) => {
                    const isExternal = item.to.startsWith('http')
                    const Component = isExternal ? 'a' : Link

                    const extraProps = isExternal
                      ? { href: item.to, target: '_blank', rel: 'noreferrer' }
                      : { to: item.to }
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
