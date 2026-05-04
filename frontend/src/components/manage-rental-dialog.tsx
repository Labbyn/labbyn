import React, { useState } from 'react'
import { Loader2, Plus, ToolCase } from 'lucide-react'
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
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { SidebarMenuButton } from '@/components/ui/sidebar'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useCreateCategoryMutation } from '@/integrations/category/category.mutation'
import { zodValidate } from '@/utils/index'
import { rentalsInvenotryItemQueryOptions } from '@/integrations/rentals/rentals.query'

const schemas = {
  name: z.string().min(1, 'Name is required'),
}

export function ManageRentalDialog({
  children, itemId
}: {
  children?: React.ReactNode
  itemId: number
}) {
  
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data: rentals } = useSuspenseQuery(rentalsInvenotryItemQueryOptions(itemId))

  const mutation = useMutation({
    mutationKey: ['create-category'],
    mutationFn: useCreateCategoryMutation,
    onSuccess: () => {
      toast.success('Category added successfully')
      queryClient.invalidateQueries({ queryKey: ['categories'] })
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
    },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value)
    },
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div>
         <Button
          variant="outline"
          type="button"
        >Manage rentals</Button>
        </div>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Rentals</DialogTitle>
          <DialogDescription>Add or Delete rentals</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            form.handleSubmit()
          }}
        >
          <div>
            <span>Current Rentals</span>
          </div>
          <div className="max-h-[60vh] overflow-y-auto space-y-4 p-1 mb-6">
            {/* Category name */}
            <form.Field
              name="name"
              validators={{ onChange: zodValidate(schemas.name) }}
              children={(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>Category Name</FieldLabel>
                  <Input
                    id={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="e.g. Cables"
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
                      <Loader2 className="animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Apply
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
