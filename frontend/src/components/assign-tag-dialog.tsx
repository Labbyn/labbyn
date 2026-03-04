import { useState } from 'react'
import { Loader2, Plus } from 'lucide-react'
import { useForm } from '@tanstack/react-form'
import { useSuspenseQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { AssignDetachTagForm } from '@/integrations/tags/tags.types'
import {
  MultiSelect,
  MultiSelectContent,
  MultiSelectGroup,
  MultiSelectItem,
  MultiSelectTrigger,
  MultiSelectValue,
} from '@/components/ui/multi-select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { SidebarMenuButton } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAttachTagMutation } from '@/integrations/tags/tags.mutation'
import { tagsQueryOptions } from '@/integrations/tags/tags.query'

interface AssignTagDialogProps {
  entityType?: 'machine' | 'rack' | 'document' | 'room'
  entityId?: string
}

export function AssignTagDialog({
  entityType,
  entityId,
}: AssignTagDialogProps) {
  const [open, setOpen] = useState(false)
  const { data: tags } = useSuspenseQuery(tagsQueryOptions)

  const mutation = useAttachTagMutation()

  const form = useForm({
    defaultValues: {
      entity_type: entityType!,
      entity_id: entityId!,
      tag_ids: [],
    } as AssignDetachTagForm,
    onSubmit: ({ value }) => {
      mutation.mutate(value, {
        onSuccess: () => {
          toast.success('Tags assigned successfully')
          setOpen(false)
          form.reset()
        },
        onError: (error: Error) => {
          toast.error('Operation failed', { description: error.message })
        },
      })
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

      <DialogContent className="sm:max-w-xl flex flex-col p-0 gap-0 h-[25vh] overflow-hidden">
        <DialogHeader className="px-6 py-6 pb-2 shrink-0">
          <DialogTitle>Assign tags</DialogTitle>
          <DialogDescription>Assign tags to resource</DialogDescription>
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
                name="tag_ids"
                children={(field) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>Tag</FieldLabel>
                    <MultiSelect
                      values={field.state.value}
                      onValuesChange={(values) => {
                        field.handleChange(values)
                      }}
                    >
                      <MultiSelectTrigger className="w-full">
                        <MultiSelectValue placeholder="Select tags" />
                      </MultiSelectTrigger>
                      <MultiSelectContent>
                        <MultiSelectGroup>
                          {tags.map((tag) => (
                            <MultiSelectItem
                              key={tag.id}
                              value={String(tag.id)}
                            >
                              {tag.name}
                            </MultiSelectItem>
                          ))}
                        </MultiSelectGroup>
                      </MultiSelectContent>
                    </MultiSelect>
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
                      Assign Tags
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
