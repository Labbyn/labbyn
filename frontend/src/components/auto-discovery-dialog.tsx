import { useState } from 'react'
import { Loader2, RefreshCcw } from 'lucide-react'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { z } from 'zod'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
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
  machineId: string
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
        <Button variant="ghost">
          <RefreshCcw />
          Refresh host information
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
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
          className="flex flex-col"
        >
          <div className="max-h-[60vh] overflow-y-auto space-y-4 py-1 mb-6">
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
                      field.state.meta.errors.length ? 'border-destructive' : ''
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
                      field.state.meta.errors.length ? 'border-destructive' : ''
                    }
                  />
                  <FieldError errors={field.state.meta.errors} />
                </Field>
              )}
            />
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <form.Subscribe
              selector={(state) => [state.canSubmit]}
              children={([canSubmit]) => (
                <Button
                  type="submit"
                  disabled={!canSubmit || mutation.isPending}
                >
                  {mutation.isPending ? (
                    <>
                      <Loader2 className="animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <RefreshCcw />
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
