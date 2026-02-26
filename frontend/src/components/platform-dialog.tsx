import { useState } from 'react'
import { AlertCircle, Cpu, Loader2, Plus, Server } from 'lucide-react'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { z } from 'zod'

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

// --- Validator Helper ---

function zodValidate(schema: z.ZodType<any>) {
  return ({ value }: { value: any }) => {
    const result = schema.safeParse(value)
    if (!result.success) {
      return { message: result.error.errors[0].message }
    }
    return undefined
  }
}

export function AddPlatformDialog() {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

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
      ip: '',
      mac: '',
      location: undefined,
      team: undefined,
      pdu_port: undefined,
      os: '',
      sn: '',
      note: '',
      cpu: [],
      ram: '',
      disk: [],
      layout: undefined,
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <SidebarMenuButton>
          <Cpu className="size-4" />
          <span>Add Platform</span>
        </SidebarMenuButton>
      </DialogTrigger>

      {/* Added overflow-hidden to clip the footer's square corners */}
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

              {/* Conditional: Manual DB Fields */}
              <form.Subscribe
                selector={(state) => state.values.addToDb}
                children={(addToDb) => {
                  if (!addToDb) return null
                  return (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300 border-t pt-4">
                      <div className="flex items-center gap-2">
                        <Server className="h-4 w-4 text-muted-foreground" />
                        <h3 className="text-sm font-semibold">
                          Inventory Details
                        </h3>
                      </div>

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
                          name="ip"
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
                          name="mac"
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
                        <form.Field
                          name="location"
                          children={(field) => (
                            <Field>
                              <FieldLabel htmlFor={field.name}>
                                Location ID
                              </FieldLabel>
                              <Input
                                id={field.name}
                                type="number"
                                value={field.state.value || ''}
                                onChange={(e) =>
                                  field.handleChange(Number(e.target.value))
                                }
                              />
                            </Field>
                          )}
                        />
                      </div>

                      <FieldGroup className="grid-cols-3">
                        <form.Field
                          name="cpu"
                          children={(field) => (
                            <Field>
                              <FieldLabel htmlFor={field.name}>CPU</FieldLabel>
                              <Input
                                id={field.name}
                                value={
                                  field.state.value
                                    ?.map((c) => c.name)
                                    .join(', ') || ''
                                }
                                onChange={(e) =>
                                  field.handleChange([
                                    {
                                      name: e.target.value,
                                      id: 0,
                                      machine_id: 0,
                                    },
                                  ])
                                }
                              />
                            </Field>
                          )}
                        />
                        <form.Field
                          name="ram"
                          children={(field) => (
                            <Field>
                              <FieldLabel htmlFor={field.name}>RAM</FieldLabel>
                              <Input
                                id={field.name}
                                value={field.state.value || ''}
                                onChange={(e) =>
                                  field.handleChange(e.target.value)
                                }
                              />
                            </Field>
                          )}
                        />
                        <form.Field
                          name="disk"
                          children={(field) => (
                            <Field>
                              <FieldLabel htmlFor={field.name}>Disk</FieldLabel>
                              <Input
                                id={field.name}
                                value={
                                  field.state.value
                                    ?.map((d) => d.name)
                                    .join(', ') || ''
                                }
                                onChange={(e) =>
                                  field.handleChange([
                                    {
                                      name: e.target.value,
                                      capacity: '',
                                      id: 0,
                                      machine_id: 0,
                                    },
                                  ])
                                }
                              />
                            </Field>
                          )}
                        />
                      </FieldGroup>
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
