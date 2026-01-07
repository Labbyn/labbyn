'use client'

import { useState } from 'react'
import { Cpu, Loader2 } from 'lucide-react'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { SidebarMenuButton } from '@/components/ui/sidebar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'

  const ENDPOINTS = {
    addMachineToDB: `http://${import.meta.env.VITE_API_URL}/db/machines`,
    addMetadataToDB: `http://${import.meta.env.VITE_API_URL}/db/metadata`,
    scan: `http://${import.meta.env.VITE_API_URL}/ansible/discovery`,
    deploy: `http://${import.meta.env.VITE_API_URL}/ansible/setup_agent`,
    updatePrometheus: `http://${import.meta.env.VITE_API_URL}/prometheus/target`,
  }

  const authorizedFetch = async (url: string, method: string, body: any, errorMsg: string) => {
  const res = await fetch(url, {
    method: method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || errorMsg);
  }
  return res.json();
};

// TO DO:
// input validation (IP, MAC)
// drop list with teams, rooms etc. for manual adding
// small refactor for security/good practices 

export function AddPlatformDialog() {
  const [open, setOpen] = useState(false)

  const mutation = useMutation({
    mutationFn: async (values: any) => {

      const results = []

      if (values.addToDB) {
        const metadataPayload = {
          agent_prometheus: false,
          ansible_access: false,
          ansible_root_access: false,
        }

        const metadataResponse = await authorizedFetch(ENDPOINTS.addMetadataToDB, "POST", metadataPayload, "Metadata add failed")
        
        results.push(metadataResponse)

        const machinePayload = {
          name: values.name || values.hostname,
          ip_address: values.ip || undefined,
          mac_address: values.mac || undefined,
          localization_id: values.location ? Number(values.location) : 1,
          pdu_port: values.pdu_port ? Number(values.pdu_port) : undefined,
          team_id: values.team ? Number(values.team) : undefined,
          os: values.os || undefined,
          serial_number: values.sn || undefined,
          note: values.note || undefined,
          cpu: values.cpu || undefined,
          ram: values.ram || undefined,
          disk: values.disk || undefined,
          layout_id: values.layout ? Number(values.layout) : undefined,
          metadata_id: metadataResponse.id
        }
        try{
          results.push(await authorizedFetch(ENDPOINTS.addMachineToDB, "POST", machinePayload, "Machine add failed"))
        } catch (error) {
          authorizedFetch(`${ENDPOINTS.addMetadataToDB}/${metadataResponse.id}`, "DELETE", {}, "Machine add failed")
        }
        
      }

      if (values.deployAgent) {
        const deployPayload = {
          host: values.hostname,
          extra_vars: {
          ansible_user: values.login,
          ansible_password: values.password,
          ansible_become_password: values.password,
        },
      }
        const prometheusPayload = {
          instance: `${values.hostname}:9100`,
          labels: {
            env: 'virtual',
            host: values.hostname,
            role: 'virtual'
          },
        }
        results.push(await authorizedFetch(ENDPOINTS.deploy, "POST", deployPayload, 'Agent deployment failed'));
        results.push(await authorizedFetch(ENDPOINTS.updatePrometheus, "POST", prometheusPayload, 'Prometheus update failed'));
      }

      if (values.scanPlatform) {
        const scanPayload = {
          hosts: [values.hostname],
          extra_vars: {
          ansible_user: values.login,
          ansible_password: values.password,
          ansible_become_password: values.password,
        },
      }
        results.push(await authorizedFetch(ENDPOINTS.scan, "POST", scanPayload, 'Platform scan failed'));
      }
      
      return results
    },
    onSuccess: () => {
      toast.success('Platform added successfully!', {
        description: 'All tasks successfully completed.',
      })
      form.reset()
    },
    onError: (error: Error) => {
      toast.error('Deployment failed', {
        description: error.message,
      })
    },
  })

  const form = useForm({
    defaultValues: {
      hostname: '',
      scanPlatform: false,
      deployAgent: false,
      login: '',
      password: '',
      // only DB
      addToDb: false,
      name: '',
      ip: '',
      mac: '',
      location: undefined,
      team: undefined,
      pdu_port: undefined,
      os: '',
      sn: '',
      note: '',
      cpu: '',
      ram: '',
      disk: '',
      layout: undefined,
    },
    onSubmit: async ({ value }) => {
      await mutation.mutate(value)
    },
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <SidebarMenuButton className="data-[slot=sidebar-menu-button]:p-2! w-50% cursor-pointer">
          <Cpu className="size-5!" />
          <span className="text-base font-semibold">Add Platform</span>
        </SidebarMenuButton>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Platform</DialogTitle>
          <DialogDescription>
            Fill in the details below to add a new platform.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            form.handleSubmit()
          }}
          className="space-y-6 py-4"
        >
          {/* Hostname Field */}
          <form.Field
            name="hostname"
            children={(field) => (
              <div className="grid gap-2">
                <Label htmlFor={field.name}>Hostname</Label>
                <Input
                  id={field.name}
                  required
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="e.g. server.name or 192.168.1.1"
                />
              </div>
            )}
          /> 
          {/* Options */}            
          <form.Subscribe
            selector={(state) => ({
              addToDB: state.values.addToDB,
              scan: state.values.scanPlatform,
              deploy: state.values.deployAgent
            })}
            children={(values) => (
              <div className="flex flex-col gap-3 rounded-md border p-4">
                Add to database
                <form.Field
                  name="addToDB"
                  children={(field) => (
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={field.name}
                        checked={field.state.value}
                        disabled={values.scan}
                        onCheckedChange={(checked) => {
                          field.handleChange(!!checked)
                        }}
                      />
                      <Label htmlFor={field.name} className={values.scan ? "text-muted-foreground" : "cursor-pointer"}>
                        Manual add
                      </Label>
                    </div>
                  )}
                />
                {/* 2. Scan Option */}
                <form.Field
                  name="scanPlatform"
                  children={(field) => (
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={field.name}
                        checked={field.state.value}
                        disabled={values.addToDB}
                        onCheckedChange={(checked) => field.handleChange(!!checked)}
                      />
                      <Label htmlFor={field.name} className={values.addToDB ? "text-muted-foreground" : "cursor-pointer"}>
                        Platform scan
                      </Label>
                    </div>
                  )}
                />

                <div className="h-[1px] bg-border w-full my-1" />

                {/* 3. Deploy Option */}
                Additional options
                <form.Field
                  name="deployAgent"
                  children={(field) => (
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={field.name}
                        checked={field.state.value}
                        onCheckedChange={(checked) => field.handleChange(!!checked)}
                      />
                      <Label htmlFor={field.name} className={values.addToDB ? "text-muted-foreground" : "cursor-pointer"}>
                        Deploy Prometheus Agent
                      </Label>
                    </div>
                  )}
                />
              </div>
            )}
          />

          {/* Conditional Credentials Section */}
          <form.Subscribe
            selector={(state) => [
              state.values.scanPlatform,
              state.values.deployAgent,
            ]}
            children={([scan, deploy]) => {
              if (!scan && !deploy) return null
              return (
                <div className="grid gap-4 border-t pt-4 animate-in fade-in slide-in-from-top-2">
                  <form.Field
                    name="login"
                    children={(field) => (
                      <div className="grid gap-2">
                        <Label htmlFor={field.name}>Sudo Login</Label>
                        <Input
                          id={field.name}
                          required
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                      </div>
                    )}
                  />
                  <form.Field
                    name="password"
                    children={(field) => (
                      <div className="grid gap-2">
                        <Label htmlFor={field.name}>Sudo Password</Label>
                        <Input
                          id={field.name}
                          type="password"
                          required
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                      </div>
                    )}
                  />
                  
                </div>
              )
            }}
          />
          {/* Conditional: Manual DB Fields (Scrollable) */}
          <form.Subscribe
            selector={(state) => state.values.addToDB}
            children={(isAddToDB) => {
              if (!isAddToDB) return null
              return (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 border-t pt-4">
                  <Label className="text-muted-foreground">Platform details (Optional)</Label>
                  
                  {/* Scrollable Container */}
                  <div className="max-h-[200px] overflow-y-auto pr-2 grid gap-4 border rounded-md p-3 bg-muted/20">
                    <form.Field name="name" children={(field) => (
                      <div className="grid gap-2">
                        <Label htmlFor={field.name}>Name</Label>
                        <Input id={field.name} value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} placeholder="Server 1" />
                      </div>
                    )} />

                    <form.Field name="ip" children={(field) => (
                      <div className="grid gap-2">
                        <Label htmlFor={field.name}>IP Address</Label>
                        <Input id={field.name} value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} placeholder="192.168.0.1" />
                      </div>
                    )} />

                    <form.Field name="mac" children={(field) => (
                      <div className="grid gap-2">
                        <Label htmlFor={field.name}>MAC Address</Label>
                        <Input id={field.name} value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} placeholder="00:00:00:00:00" />
                      </div>
                    )} />

                    <form.Field name="location" children={(field) => (
                      <div className="grid gap-2">
                        <Label htmlFor={field.name}>Location</Label>
                        <Input id={field.name} value={field.state.value} type="number" min="0" onChange={(e) => field.handleChange(e.target.value)} placeholder="1" />
                      </div>
                    )} />

                    <form.Field name="team" children={(field) => (
                      <div className="grid gap-2">
                        <Label htmlFor={field.name}>Team ID</Label>
                        <Input id={field.name} value={field.state.value} type="number"  min="0" onChange={(e) => field.handleChange(e.target.value)} placeholder="2222" />
                      </div>
                    )} />
                    
                    <form.Field name="pdu_port" children={(field) => (
                      <div className="grid gap-2">
                        <Label htmlFor={field.name}>PDU Port</Label>
                        <Input id={field.name} value={field.state.value} type="number"  min="0" onChange={(e) => field.handleChange(e.target.value)} placeholder="4" />
                      </div>
                    )} />

                    <form.Field name="os" children={(field) => (
                      <div className="grid gap-2">
                        <Label htmlFor={field.name}>OS</Label>
                        <Input id={field.name} value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} placeholder="Ubuntu 24.04" />
                      </div>
                    )} />

                    <form.Field name="sn" children={(field) => (
                      <div className="grid gap-2">
                        <Label htmlFor={field.name}>Serial Number</Label>
                        <Input id={field.name} value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} placeholder="123456789" />
                      </div>
                    )} />

                    <form.Field name="note" children={(field) => (
                      <div className="grid gap-2">
                        <Label htmlFor={field.name}>Note</Label>
                        <Input id={field.name} value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} placeholder="Left USB port is broken" />
                      </div>
                    )} />

                    <form.Field name="cpu" children={(field) => (
                      <div className="grid gap-2">
                        <Label htmlFor={field.name}>CPU</Label>
                        <Input id={field.name} value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} placeholder="Intel Core i7" />
                      </div>
                    )} />

                    <form.Field name="ram" children={(field) => (
                      <div className="grid gap-2">
                        <Label htmlFor={field.name}>RAM memory</Label>
                        <Input id={field.name} value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} placeholder="128GB" />
                      </div>
                    )} />

                    <form.Field name="disk" children={(field) => (
                      <div className="grid gap-2">
                        <Label htmlFor={field.name}>Disk</Label>
                        <Input id={field.name} value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} placeholder="4TB SSD" />
                      </div>
                    )} />
                    
                    <form.Field name="layout" children={(field) => (
                      <div className="grid gap-2">
                        <Label htmlFor={field.name}>Layout</Label>
                        <Input id={field.name} value={field.state.value} type="number" min="0" onChange={(e) => field.handleChange(e.target.value)} placeholder="1" />
                      </div>
                    )} />

                  </div>
                </div>
              )
            }}
          />
          <form.Subscribe
            selector={(state) => ({
              addToDB: state.values.addToDB,
              scan: state.values.scanPlatform,
              deploy: state.values.deployAgent,
            })}
            children={({ addToDB, scan, deploy }) => {
              // Check if at least one option is selected
              const isSelectionEmpty = !addToDB && !scan && !deploy

              return (
                <Button
                  type="submit"
                  className="w-full"
                  disabled={mutation.isPending || isSelectionEmpty}
                >
                  {mutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Apply'
                  )}
                </Button>
              )
            }}
          />
        </form>
      </DialogContent>
    </Dialog>
  )
}
