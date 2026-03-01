import { useState } from 'react'
import { AlertCircle, Cpu, Loader2, Plus, Server, Tag } from 'lucide-react'
import { useForm } from '@tanstack/react-form'
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { toast } from 'sonner'
import { z } from 'zod'
import { InputChecklist } from './input-checklist'
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
import { useCreateTagMutation } from '@/integrations/tags/tags.mutation'
import { zodValidate } from '@/utils/index'
import { teamsQueryOptions } from '@/integrations/teams/teams.query'
import { tagsQueryOptions } from '@/integrations/tags/tags.query'
import { racksListQueryOptions } from '@/integrations/racks/racks.query'
import { inventoryQueryOptions } from '@/integrations/inventory/inventory.query'
import { machinesQueryOptions } from '@/integrations/machines/machines.query'

// TO DO: add mutations, add dynamic item fetch

const schemas = {
  team: z.string().min(1, 'Team is required'),
  itemType: z.string().min(1, 'ItemType is required'),
  item: z.string().min(1, 'Item is required'),
  tag: z.string().min(1, 'Tag is required'),
}

export function AssignTagDialog({ itemType, item, tag }) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const { data: teams } = useSuspenseQuery(teamsQueryOptions)
  const { data: tags } = useSuspenseQuery(tagsQueryOptions)

  const itemsMap = {
    racks: racksListQueryOptions,
    inventory: inventoryQueryOptions,
    machines: machinesQueryOptions,
  }

  const itemTypes = Object.keys(itemsMap).map((key) => ({
    id: key,
    name: key.charAt(0).toUpperCase() + key.slice(1),
  }))

  const itemQueries = Object.values(itemsMap)

  const mutation = useMutation({
    mutationFn: useCreateTagMutation,
    onSuccess: () => {
      toast.success('Tag assigned successfully')
      queryClient.invalidateQueries({ queryKey: ['tags', 'assign'] })
      setOpen(false)
      form.reset()
    },
    onError: (error: Error) => {
      toast.error('Operation failed', { description: error.message })
    },
  })

  const form = useForm({
    defaultValues: {
      team: '',
      itemType: '',
      item: '',
      tag: '',
    },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value)
    },
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <SidebarMenuButton>
          <Plus className="h-5 w-5" />
          <span>Assign tag</span>
        </SidebarMenuButton>
      </DialogTrigger>

      <DialogContent className="sm:max-w-xl flex flex-col p-0 gap-0 h-[50vh] overflow-hidden">
        <DialogHeader className="px-6 py-6 pb-2 shrink-0">
          <DialogTitle>Assign tag</DialogTitle>
          <DialogDescription>Assign tags to resources</DialogDescription>
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
              <form.Field
                name="team"
                validators={{ onChange: zodValidate(schemas.team) }}
                children={(field) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>Team</FieldLabel>
                    <InputChecklist
                      items={teams}
                      value={field.state.value}
                      onChange={(newTeam) => field.handleChange(newTeam)}
                    />
                    <FieldError errors={field.state.meta.errors} />
                  </Field>
                )}
              />
              <form.Field
                name="itemType"
                validators={{ onChange: zodValidate(schemas.itemType) }}
                children={(field) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>Item Type</FieldLabel>
                    <InputChecklist
                      items={itemTypes}
                      value={field.state.value}
                      onChange={(newItemType) =>
                        field.handleChange(newItemType)
                      }
                    />
                    <FieldError errors={field.state.meta.errors} />
                  </Field>
                )}
              />
              <form.Field
                name="item"
                validators={{ onChange: zodValidate(schemas.team) }}
                children={(field) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>Item</FieldLabel>
                    <InputChecklist
                      items={teams}
                      value={field.state.value}
                      onChange={(newItem) => field.handleChange(newItem)}
                    />
                    <FieldError errors={field.state.meta.errors} />
                  </Field>
                )}
              />
              <form.Field
                name="tag"
                validators={{ onChange: zodValidate(schemas.team) }}
                children={(field) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>Tag</FieldLabel>
                    <InputChecklist
                      items={tags}
                      value={field.state.value}
                      onChange={(newTeam) => field.handleChange(newTeam)}
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
                      <Plus className="mr-2 h-4 w-4" />
                      Assign Tag
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
