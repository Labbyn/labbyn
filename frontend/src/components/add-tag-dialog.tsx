import { useState } from 'react'
import { Loader2, Plus, Tag } from 'lucide-react'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { z } from 'zod'
import { colorMap } from './tag-list'
import { InputChecklist } from './input-checklist'
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
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useCreateTagMutation } from '@/integrations/tags/tags.mutation'
import { zodValidate } from '@/utils/index'

const schemas = {
  name: z.string().min(1, 'Name is required'),
  color: z.string().min(1, 'Color is required'),
}

export function AddTagDialog() {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const colorArray = Object.keys(colorMap).map((key) => ({
    id: key,
    name: key,
  }))

  const mutation = useMutation({
    mutationFn: useCreateTagMutation,
    onSuccess: () => {
      toast.success('Tag added successfully')
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      setOpen(false)
      form.reset()
    },
    onError: (error: Error) => {
      toast.error('Operation failed', { description: error.message })
    },
  })

  const form = useForm({
    defaultValues: {
      name: '',
      color: '',
    },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value)
    },
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <SidebarMenuButton>
          <Tag className="h-5 w-5" />
          <span>Add Tag</span>
        </SidebarMenuButton>
      </DialogTrigger>

      <DialogContent className="sm:max-w-xl flex flex-col p-0 gap-0 h-[35vh] overflow-hidden">
        <DialogHeader className="px-6 py-6 pb-2 shrink-0">
          <DialogTitle>Add new tag</DialogTitle>
          <DialogDescription>
            Create new tag to group your resources
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
              {/* Tag name - Always Required */}
              <form.Field
                name="name"
                validators={{ onChange: zodValidate(schemas.name) }}
                children={(field) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>Tag Name</FieldLabel>
                    <Input
                      id={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="e.g. performance"
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
                name="color"
                validators={{ onChange: zodValidate(schemas.color) }}
                children={(field) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>Color</FieldLabel>
                    <InputChecklist
                      items={colorArray}
                      value={field.state.value}
                      onChange={(newColor) => field.handleChange(newColor)}
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
                      Add Tag
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
