import { useState } from 'react'
import { AlertCircle, Cpu, Loader2, Plus, Server, Trash2 } from 'lucide-react'
import { useForm, useStore } from '@tanstack/react-form'
import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { toast } from 'sonner'
import * as z from 'zod'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import type { PlatformFormValues } from '@/integrations/machines/machines.types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field'
import { SidebarMenuButton } from '@/components/ui/sidebar'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { handlePlatformSubmission } from '@/integrations/machines/machines.mutation'
import { zodValidate } from '@/utils/index'
import { teamsQueryOptions } from '@/integrations/teams/teams.query'
import { labsBaseQueryOptions } from '@/integrations/labs/labs.query'
import { racksBaseListQueryOptions } from '@/integrations/racks/racks.query'
import { singleShelfQueryOptions } from '@/integrations/shelves/shelves.query'

// --- Schemas ---

const schemas = {
  hostname: z.string().min(1, 'Hostname is required').max(255),
  ip: z.string().ip({ version: 'v4' }).optional().or(z.literal('')),
  mac: z
    .string()
    .regex(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/, 'Invalid MAC address')
    .optional()
    .or(z.literal('')),
}

export function AddPlatformDialog() {
  const [open, setOpen] = useState(false)
  const [selectedRack, setSelectedRack] = useState<number | undefined>(
    undefined,
  )
  const queryClient = useQueryClient()

  const { data: labs } = useSuspenseQuery(labsBaseQueryOptions)
  const { data: teams } = useSuspenseQuery(teamsQueryOptions)
  const { data: racks } = useSuspenseQuery(racksBaseListQueryOptions)

  const mutation = useMutation({
    mutationFn: handlePlatformSubmission,
    onSuccess: () => {
      toast.success('Platform added successfully')
      queryClient.invalidateQueries({ queryKey: ['machines'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      setOpen(false)
      form.reset()
    },
    onError: (error: Error) => {
      toast.error('Operation failed', { description: error.message })
    },
  })

  const form = useForm({
    defaultValues: {
      hostname: '',
      addToDb: false,
      scanPlatform: false,
      deployAgent: false,
      login: '',
      password: '',
      name: '',
      ip_address: '',
      mac_address: '',
      localization_id: undefined,
      team_id: undefined,
      pdu_port: undefined,
      os: '',
      serial_number: '',
      note: '',
      cpus: [],
      ram: '',
      disks: [],
      shelf_id: undefined,
    } as PlatformFormValues,
    onSubmit: async ({ value }) => {
      if (
        (value.scanPlatform || value.deployAgent) &&
        (!value.login || !value.password)
      ) {
        toast.error('Credentials required', {
          description: 'Please provide sudo login and password.',
        })
        return
      }
      await mutation.mutateAsync(value)
    },
  })

  const formValues = useStore(form.store, (state) => state.values)

  const selectedTeam = formValues.team_id
  const selectedRoom = formValues.localization_id

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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <SidebarMenuButton>
          <Cpu className="size-4" />
          <span>Add Platform</span>
        </SidebarMenuButton>
      </DialogTrigger>

      <DialogContent className="sm:max-w-xl flex flex-col p-0 gap-0 h-[85vh] overflow-hidden">
        <DialogHeader className="px-6 py-6 pb-2 shrink-0">
          <DialogTitle>Add New Platform</DialogTitle>
          <DialogDescription>
            Configure a new device, deploy agents, or add it to the inventory
            database.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            form.handleSubmit()
          }}
          className="flex flex-col flex-1 min-h-0 overflow-hidden"
        >
          <ScrollArea className="flex-1 min-h-0">
            <div className="space-y-6 px-6 py-4">
              {/* Hostname - Always Required */}
              <form.Field
                name="hostname"
                validators={{ onChange: zodValidate(schemas.hostname) }}
                children={(field) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>
                      Hostname / IP *
                    </FieldLabel>
                    <Input
                      id={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="e.g. server-01.local"
                      className={
                        field.state.meta.errors.length
                          ? 'border-destructive'
                          : ''
                      }
                    />
                    <FieldError errors={field.state.meta.errors} />
                  </Field>
                )}
              />

              {/* Actions Selection */}
              <FieldSet className="gap-4 rounded-lg border p-4 bg-muted/20">
                <FieldLegend className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Operations
                </FieldLegend>

                <form.Subscribe
                  selector={(state) => [
                    state.values.addToDb,
                    state.values.scanPlatform,
                  ]}
                  children={([addToDb, scan]) => (
                    <div className="grid gap-4">
                      <form.Field
                        name="addToDb"
                        children={(field) => (
                          <div className="flex flex-row items-start space-x-3 space-y-0">
                            <Checkbox
                              id="addToDb"
                              checked={field.state.value}
                              disabled={scan}
                              onCheckedChange={(c) => field.handleChange(!!c)}
                            />
                            <div className="space-y-1 leading-none">
                              <label
                                htmlFor="addToDb"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                              >
                                Manual Inventory Entry
                              </label>
                              <p className="text-xs text-muted-foreground">
                                Manually enter hardware specs into the database.
                              </p>
                            </div>
                          </div>
                        )}
                      />

                      <form.Field
                        name="scanPlatform"
                        children={(field) => (
                          <div className="flex flex-row items-start space-x-3 space-y-0">
                            <Checkbox
                              id="scanPlatform"
                              checked={field.state.value}
                              disabled={addToDb}
                              onCheckedChange={(c) => field.handleChange(!!c)}
                            />
                            <div className="space-y-1 leading-none">
                              <label
                                htmlFor="scanPlatform"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                              >
                                Auto-Discovery (Ansible)
                              </label>
                              <p className="text-xs text-muted-foreground">
                                Scan the host to gather hardware details
                                automatically.
                              </p>
                            </div>
                          </div>
                        )}
                      />

                      <div className="h-px bg-border/50" />

                      <form.Field
                        name="deployAgent"
                        children={(field) => (
                          <div className="flex flex-row items-start space-x-3 space-y-0">
                            <Checkbox
                              id="deployAgent"
                              checked={field.state.value}
                              onCheckedChange={(c) => field.handleChange(!!c)}
                            />
                            <div className="space-y-1 leading-none">
                              <label
                                htmlFor="deployAgent"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                              >
                                Deploy Prometheus Agent
                              </label>
                              <p className="text-xs text-muted-foreground">
                                Install Node Exporter and register target.
                              </p>
                            </div>
                          </div>
                        )}
                      />
                    </div>
                  )}
                />
              </FieldSet>

              {/* Conditional: Credentials */}
              <form.Subscribe
                selector={(state) => [
                  state.values.scanPlatform,
                  state.values.deployAgent,
                ]}
                children={([scan, deploy]) => {
                  if (!scan && !deploy) return null
                  return (
                    <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                      <Alert
                        variant="default"
                        className="mb-4 bg-blue-50/50 dark:bg-blue-950/10 border-blue-200 dark:border-blue-800"
                      >
                        <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <AlertTitle className="text-blue-800 dark:text-blue-300">
                          Credentials Required
                        </AlertTitle>
                        <AlertDescription className="text-blue-700 dark:text-blue-400">
                          Sudo access is required to run Ansible playbooks
                          against the target.
                        </AlertDescription>
                      </Alert>

                      <FieldGroup className="grid-cols-2">
                        <form.Field
                          name="login"
                          validators={{
                            onChangeListenTo: ['scanPlatform', 'deployAgent'],
                            onChange: ({ value, fieldApi }) => {
                              const { scanPlatform, deployAgent } =
                                fieldApi.form.state.values
                              if ((scanPlatform || deployAgent) && !value) {
                                return { message: 'Required' }
                              }
                              return undefined
                            },
                          }}
                          children={(field) => (
                            <Field>
                              <FieldLabel htmlFor={field.name}>
                                SSH User
                              </FieldLabel>
                              <Input
                                id={field.name}
                                value={field.state.value || ''}
                                onChange={(e) =>
                                  field.handleChange(e.target.value)
                                }
                                className={
                                  field.state.meta.errors.length
                                    ? 'border-destructive'
                                    : ''
                                }
                              />
                              <FieldError errors={field.state.meta.errors} />
                            </Field>
                          )}
                        />
                        <form.Field
                          name="password"
                          validators={{
                            onChangeListenTo: ['scanPlatform', 'deployAgent'],
                            onChange: ({ value, fieldApi }) => {
                              const { scanPlatform, deployAgent } =
                                fieldApi.form.state.values
                              if ((scanPlatform || deployAgent) && !value) {
                                return { message: 'Required' }
                              }
                              return undefined
                            },
                          }}
                          children={(field) => (
                            <Field>
                              <FieldLabel htmlFor={field.name}>
                                SSH Password
                              </FieldLabel>
                              <Input
                                id={field.name}
                                type="password"
                                value={field.state.value || ''}
                                onChange={(e) =>
                                  field.handleChange(e.target.value)
                                }
                                className={
                                  field.state.meta.errors.length
                                    ? 'border-destructive'
                                    : ''
                                }
                              />
                              <FieldError errors={field.state.meta.errors} />
                            </Field>
                          )}
                        />
                      </FieldGroup>
                    </div>
                  )
                }}
              />

              <form.Subscribe
                selector={(state) => state.values.addToDb}
                children={(addToDb) => {
                  if (!addToDb) return null

                  return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300 border-t pt-4">
                      <div className="flex items-center gap-2">
                        <Server className="h-4 w-4 text-muted-foreground" />
                        <h3 className="text-sm font-semibold">
                          Machine Details
                        </h3>
                      </div>

                      {/* General Details */}
                      <div className="grid grid-cols-2 gap-4">
                        <form.Field
                          name="name"
                          children={(field) => (
                            <Field>
                              <FieldLabel htmlFor={field.name}>
                                Display Name
                              </FieldLabel>
                              <Input
                                id={field.name}
                                placeholder="Friendly name"
                                value={field.state.value || ''}
                                onChange={(e) =>
                                  field.handleChange(e.target.value)
                                }
                              />
                            </Field>
                          )}
                        />

                        <form.Field
                          name="serial_number"
                          children={(field) => (
                            <Field>
                              <FieldLabel htmlFor={field.name}>
                                Serial Number
                              </FieldLabel>
                              <Input
                                id={field.name}
                                placeholder="SN-123456"
                                value={field.state.value || ''}
                                onChange={(e) =>
                                  field.handleChange(e.target.value)
                                }
                              />
                            </Field>
                          )}
                        />
                      </div>

                      {/* Network & Location Details */}
                      <div className="grid grid-cols-2 gap-4">
                        <form.Field
                          name="ip_address"
                          validators={{ onChange: zodValidate(schemas.ip) }}
                          children={(field) => (
                            <Field>
                              <FieldLabel htmlFor={field.name}>
                                IP Address
                              </FieldLabel>
                              <Input
                                id={field.name}
                                placeholder="192.168.1.10"
                                value={field.state.value || ''}
                                onChange={(e) =>
                                  field.handleChange(e.target.value)
                                }
                                className={
                                  field.state.meta.errors.length
                                    ? 'border-destructive'
                                    : ''
                                }
                              />
                              <FieldError errors={field.state.meta.errors} />
                            </Field>
                          )}
                        />

                        <form.Field
                          name="mac_address"
                          validators={{ onChange: zodValidate(schemas.mac) }}
                          children={(field) => (
                            <Field>
                              <FieldLabel htmlFor={field.name}>
                                MAC Address
                              </FieldLabel>
                              <Input
                                id={field.name}
                                placeholder="AA:BB:CC:DD:EE:FF"
                                value={field.state.value || ''}
                                onChange={(e) =>
                                  field.handleChange(e.target.value)
                                }
                                className={
                                  field.state.meta.errors.length
                                    ? 'border-destructive'
                                    : ''
                                }
                              />
                              <FieldError errors={field.state.meta.errors} />
                            </Field>
                          )}
                        />

                        {/* Team Selection */}
                        <form.Field
                          name="team_id"
                          children={(field) => (
                            <Field>
                              <FieldLabel htmlFor={field.name}>Team</FieldLabel>
                              <Select
                                value={field.state.value?.toString() ?? ''}
                                onValueChange={(value) => {
                                  field.handleChange(Number(value))
                                  form.setFieldValue(
                                    'localization_id',
                                    undefined,
                                  )
                                  setSelectedRack(undefined)
                                  form.setFieldValue('shelf_id', undefined)
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
                            </Field>
                          )}
                        />

                        {/* Room / Lab Selection */}
                        <form.Field
                          name="localization_id"
                          children={(field) => (
                            <Field>
                              <FieldLabel htmlFor={field.name}>
                                Room / Lab
                              </FieldLabel>
                              <Select
                                disabled={selectedTeam == null}
                                value={field.state.value?.toString() ?? ''}
                                onValueChange={(value) => {
                                  field.handleChange(Number(value))
                                  setSelectedRack(undefined)
                                  form.setFieldValue('shelf_id', undefined)
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
                            </Field>
                          )}
                        />

                        {/* Rack Selection  */}
                        <Field>
                          <FieldLabel htmlFor={'rack-select'}>Rack</FieldLabel>
                          <Select
                            disabled={selectedRoom == null}
                            value={selectedRack?.toString() ?? ''}
                            onValueChange={(value) => {
                              setSelectedRack(Number(value))
                              form.setFieldValue('shelf_id', undefined)
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
                        </Field>

                        {/* Shelf Selection */}
                        <form.Field
                          name="shelf_id"
                          children={(field) => (
                            <Field>
                              <FieldLabel htmlFor={field.name}>
                                Shelf
                              </FieldLabel>
                              <Select
                                disabled={
                                  selectedRack == null || isLoadingShelves
                                }
                                value={field.state.value?.toString() ?? ''}
                                onValueChange={(value) =>
                                  field.handleChange(Number(value))
                                }
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
                                  {shelves?.length === 0 && (
                                    <SelectItem value="none" disabled>
                                      No shelves found
                                    </SelectItem>
                                  )}
                                </SelectContent>
                              </Select>
                            </Field>
                          )}
                        />

                        <form.Field
                          name="pdu_port"
                          children={(field) => (
                            <Field>
                              <FieldLabel htmlFor={field.name}>
                                PDU Port
                              </FieldLabel>
                              <Input
                                id={field.name}
                                type="number"
                                placeholder="e.g. 1"
                                value={field.state.value || ''}
                                onChange={(e) =>
                                  field.handleChange(Number(e.target.value))
                                }
                              />
                            </Field>
                          )}
                        />
                      </div>

                      {/* Hardware & OS Details */}
                      <FieldGroup className="grid-cols-3">
                        <form.Field
                          name="os"
                          children={(field) => (
                            <Field>
                              <FieldLabel htmlFor={field.name}>
                                Operating System
                              </FieldLabel>
                              <Input
                                id={field.name}
                                placeholder="e.g. Ubuntu 22.04"
                                value={field.state.value || ''}
                                onChange={(e) =>
                                  field.handleChange(e.target.value)
                                }
                              />
                            </Field>
                          )}
                        />

                        <form.Field
                          name="ram"
                          children={(field) => (
                            <Field>
                              <FieldLabel htmlFor={field.name}>
                                RAM (GB)
                              </FieldLabel>
                              <Input
                                id={field.name}
                                placeholder="32"
                                value={field.state.value || ''}
                                onChange={(e) =>
                                  field.handleChange(e.target.value)
                                }
                              />
                            </Field>
                          )}
                        />
                      </FieldGroup>

                      <FieldGroup className="grid-cols-1 md:grid-cols-2 gap-6">
                        {/* CPU Dynamic Field */}
                        <form.Field
                          name="cpus"
                          children={(field) => {
                            const cpus = field.state.value || []

                            return (
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <FieldLabel>CPU(s)</FieldLabel>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      field.handleChange([
                                        ...cpus,
                                        { id: 0, machine_id: 0, name: '' },
                                      ])
                                    }
                                  >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add CPU
                                  </Button>
                                </div>

                                <div className="space-y-2">
                                  {cpus.map((cpu, index) => (
                                    <div
                                      key={index}
                                      className="flex items-center gap-2"
                                    >
                                      <Input
                                        placeholder="e.g. Intel Xeon"
                                        value={cpu.name}
                                        onChange={(e) => {
                                          const newCpus = [...cpus]
                                          newCpus[index] = {
                                            ...newCpus[index],
                                            name: e.target.value,
                                          }
                                          field.handleChange(newCpus)
                                        }}
                                      />
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="shrink-0 text-muted-foreground hover:text-destructive"
                                        onClick={() =>
                                          field.handleChange(
                                            cpus.filter((_, i) => i !== index),
                                          )
                                        }
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ))}
                                  {cpus.length === 0 && (
                                    <p className="text-sm text-muted-foreground italic">
                                      No CPUs added.
                                    </p>
                                  )}
                                </div>
                              </div>
                            )
                          }}
                        />

                        {/* Disk Dynamic Field */}
                        <form.Field
                          name="disks"
                          children={(field) => {
                            const disks = field.state.value || []

                            return (
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <FieldLabel>Disk(s)</FieldLabel>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      field.handleChange([
                                        ...disks,
                                        {
                                          id: 0,
                                          machine_id: 0,
                                          name: '',
                                          capacity: '',
                                        },
                                      ])
                                    }
                                  >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Disk
                                  </Button>
                                </div>

                                <div className="space-y-2">
                                  {disks.map((disk, index) => (
                                    <div
                                      key={index}
                                      className="flex items-center gap-2"
                                    >
                                      <Input
                                        placeholder="e.g Samsung ABC"
                                        value={disk.name}
                                        onChange={(e) => {
                                          const newDisks = [...disks]
                                          newDisks[index] = {
                                            ...newDisks[index],
                                            name: e.target.value,
                                          }
                                          field.handleChange(newDisks)
                                        }}
                                      />
                                      <Input
                                        placeholder="Capacity"
                                        className="w-1/3"
                                        type="number"
                                        value={disk.capacity || ''}
                                        onChange={(e) => {
                                          const newDisks = [...disks]
                                          newDisks[index] = {
                                            ...newDisks[index],
                                            capacity: e.target.value,
                                          }
                                          field.handleChange(newDisks)
                                        }}
                                      />
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="shrink-0 text-muted-foreground hover:text-destructive"
                                        onClick={() =>
                                          field.handleChange(
                                            disks.filter((_, i) => i !== index),
                                          )
                                        }
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ))}
                                  {disks.length === 0 && (
                                    <p className="text-sm text-muted-foreground italic">
                                      No disks added.
                                    </p>
                                  )}
                                </div>
                              </div>
                            )
                          }}
                        />
                      </FieldGroup>

                      {/* Additional Notes */}
                      <form.Field
                        name="note"
                        children={(field) => (
                          <Field>
                            <FieldLabel htmlFor={field.name}>Note</FieldLabel>
                            <Input
                              id={field.name}
                              placeholder="Additional information..."
                              value={field.state.value || ''}
                              onChange={(e) =>
                                field.handleChange(e.target.value)
                              }
                            />
                          </Field>
                        )}
                      />
                    </div>
                  )
                }}
              />
            </div>
          </ScrollArea>

          <DialogFooter className="p-6 pt-2 shrink-0 border-t bg-background">
            <Button
              variant="outline"
              type="button"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <form.Subscribe
              selector={(state) => [state.canSubmit]}
              children={([canSubmit]) => (
                <Button
                  type="submit"
                  disabled={!canSubmit || mutation.isPending}
                >
                  {mutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Platform
                    </>
                  )}
                </Button>
              )}
            />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
