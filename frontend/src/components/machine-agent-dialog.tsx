import { useState } from 'react'
import { HatGlasses, Loader2, RefreshCcw } from 'lucide-react'
import { useForm } from '@tanstack/react-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Separator } from './ui/separator'
import type { ApiMachineInfo } from '@/integrations/machines/machines.types'
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
import {
  useDeleteAgent,
  useDeployAgent,
} from '@/integrations/machines/machines.mutation'
import { zodValidate } from '@/utils/index'

const schemas = {
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
}

export function MachineAgentDialog({ machine }: { machine: ApiMachineInfo }) {
  const [open, setOpen] = useState(false)

  const deployMutation = useDeployAgent()
  const deleteMutation = useDeleteAgent(machine.id)

  const form = useForm({
    defaultValues: {
      username: '',
      password: '',
      host: machine.name || machine.ip_address,
    },
    onSubmit: async ({ value }) => {
      if (machine.monitoring) {
        await deleteMutation.mutateAsync(value)
        toast.success('Agent deleted successfully')
      } else {
        await deployMutation.mutateAsync(value)
        toast.success('Agent deployed successfully')
      }
      setOpen(false)
      form.reset()
    },
  })
  const isPending = deployMutation.isPending || deleteMutation.isPending

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost">
          <HatGlasses />
          Manage monitoring agent
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage monitoring agent</DialogTitle>
          <DialogDescription>
            Deploy or delete monitoring agent
          </DialogDescription>
        </DialogHeader>
        <Separator />
        <div className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          Agent status:{' '}
          {machine.monitoring ? 'Installed on platform' : 'Not found'}
        </div>
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
                <Button type="submit" disabled={!canSubmit || isPending}>
                  {isPending ? (
                    <>
                      <Loader2 className="animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <RefreshCcw />
                      {machine.monitoring ? 'Delete' : 'Deploy'}
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
