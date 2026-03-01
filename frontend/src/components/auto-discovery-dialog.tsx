import { useState } from 'react'
import {
  AlertCircle,
  Cpu,
  Loader2,
  Plus,
  RefreshCcw,
  Server,
} from 'lucide-react'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { z } from 'zod'
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
import { autoDiscoverMutation } from '@/integrations/machines/machines.mutation'
import { zodValidate } from '@/utils/index'

const schemas = {
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
}

export function AutoDiscovertDialog({
  machineId,
  machineHostname,
}: {
  machineId: number
  machineHostname: string
}) {
  const [open, setOpen] = useState(false)

  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (formValues: any) => {
      const payload = {
        host: machineHostname,
        extra_vars: {
          ansible_user: formValues.username,
          ansible_password: formValues.password,
        },
      }
      return autoDiscoverMutation(machineId, payload)
    },
    onSuccess: () => {
      toast.success('Platform scaned successfully')
      queryClient.invalidateQueries({ queryKey: ['auto-discovery'] })
      setOpen(false)
      form.reset()
    },
    onError: (error: Error) => {
      toast.error('Operation failed', { description: error.message })
    },
  })

  const form = useForm({
    defaultValues: {
      username: '',
      password: '',
    },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value)
    },
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <SidebarMenuButton>
          <RefreshCcw className="h-5 w-5" />
          <span>Refresh host information</span>
        </SidebarMenuButton>
      </DialogTrigger>

      <DialogContent className="sm:max-w-xl flex flex-col p-0 gap-0 h-[35vh] overflow-hidden">
        <DialogHeader className="px-6 py-6 pb-2 shrink-0">
          <DialogTitle>Refresh machine information</DialogTitle>
          <DialogDescription>
            Automatically refresh outdated platform informations
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
              {/* SSH User - Always Required */}
              <form.Field
                name="username"
                validators={{ onChange: zodValidate(schemas.username) }}
                children={(field) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>SSH User</FieldLabel>
                    <Input
                      id={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="e.g. ansible_user"
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
                validators={{ onChange: zodValidate(schemas.password) }}
                children={(field) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>SSH Password</FieldLabel>
                    <Input
                      id={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      type="password"
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
                      <RefreshCcw className="mr-2 h-4 w-4" />
                      Refresh information
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
