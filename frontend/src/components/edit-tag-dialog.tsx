import { Loader2 } from 'lucide-react'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { colorMap } from './tag-list'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useUpdateTagMutation } from '@/integrations/tags/tags.mutation'
import type { TagItem, ApiTagsItem } from '@/integrations/tags/tags.types'
import { zodValidate } from '@/utils/index'

const schemas = {
  name: z.string().min(1, 'Name is required'),
  color: z.string().min(1, 'Color is required'),
}

export function EditTagDialog({
  tag,
  isOpen,
  onClose,
}: {
  tag: ApiTagsItem | null
  isOpen: boolean
  onClose: () => void
}) {

  const updateTag = useUpdateTagMutation(tag?.id || 0)

  const form = useForm({
    defaultValues: {
      name: tag?.name || '',
      color: tag?.color || '',
    },
    onSubmit: async ({ value }) => {
      if (!tag) return
      await updateTag.mutateAsync(value as Partial<TagItem>)
      form.reset()
      onClose()
    },
  })

  const colorArray = Object.keys(colorMap).map((key) => ({ id: key, name: key }))

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Tag</DialogTitle>
          <DialogDescription>Edit tag name and color</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            form.handleSubmit()
          }}
        >
          <div className="max-h-[60vh] overflow-y-auto space-y-4 p-1 mb-6">
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
                      field.state.meta.errors.length ? 'border-destructive' : ''
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
                  <Select
                    value={String(field.state.value || '')}
                    onValueChange={(value) => field.handleChange(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a color" />
                    </SelectTrigger>
                    <SelectContent>
                      {colorArray.map((color) => (
                        <SelectItem key={color.id} value={color.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: (color.name as any) as string }}
                            />
                            <span className="capitalize">{color.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => onClose()}>
              Cancel
            </Button>
            <form.Subscribe
              selector={(state) => [state.canSubmit]}
              children={([canSubmit]) => (
                <Button type="submit" disabled={!canSubmit || updateTag.isPending}>
                  {updateTag.isPending ? (
                    <>
                      <Loader2 className="animate-spin" /> Processing...
                    </>
                  ) : (
                    'Save'
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
