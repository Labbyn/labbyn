import { useState } from 'react'
import { Loader2, Plus, ToolCase } from 'lucide-react'
import { useForm, useStore } from '@tanstack/react-form'
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { toast } from 'sonner'
import { z } from 'zod'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
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
import { useCreateInventoryItemMutation } from '@/integrations/inventory/inventory.mutation'
import { zodValidate } from '@/utils/index'
import { teamsQueryOptions } from '@/integrations/teams/teams.query'
import { labsBaseQueryOptions } from '@/integrations/labs/labs.query'
import { categoryListQueryOptions } from '@/integrations/category/category.query'

const schemas = {
  name: z.string().min(1, 'Name is required'),
}

type InventoryFormValues = {
  name: string
  quantity: number
  category_id: number
  team_id: number
  localization_id: number
  rental_status: boolean
}

export function AddInventoryDialog() {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const { data: labs } = useSuspenseQuery(labsBaseQueryOptions)
  const { data: teams } = useSuspenseQuery(teamsQueryOptions)
  const { data: categories } = useSuspenseQuery(categoryListQueryOptions)

  const mutation = useMutation({
    mutationKey: ['create-item'],
    mutationFn: useCreateInventoryItemMutation,
    onSuccess: () => {
      toast.success('Item added successfully')
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
      name: '',
      quantity: 0,
      category_id: 0,
      team_id: 0,
      localization_id: 0,
      rental_status: false,
    } as InventoryFormValues,
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value)
    },
  })

  const formValues = useStore(form.store, (state) => state.values)

  const selectedTeam = formValues.team_id

  const availableRooms = labs.filter(
    (lab) => Number(lab.team_id) === Number(selectedTeam),
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <SidebarMenuButton>
          <ToolCase />
          <span>Add Inventory Item</span>
        </SidebarMenuButton>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add new Item</DialogTitle>
          <DialogDescription>Create new inventory item</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            form.handleSubmit()
          }}
        >
          <div className="max-h-[60vh] overflow-y-auto space-y-4 p-1 mb-6">
            {/* Item name - Always Required */}
            <form.Field
              name="name"
              validators={{ onChange: zodValidate(schemas.name) }}
              children={(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>Item Name</FieldLabel>
                  <Input
                    id={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="e.g. USB-Cable"
                    className={
                      field.state.meta.errors.length ? 'border-destructive' : ''
                    }
                  />
                  <FieldError errors={field.state.meta.errors} />
                </Field>
              )}
            />
            <form.Field
              name="quantity"
              children={(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>Quantity</FieldLabel>
                  <Input
                    id={field.name}
                    placeholder="e.g. 5"
                    type="number"
                    value={field.state.value || ''}
                    onChange={(e) => field.handleChange(Number(e.target.value))}
                  />
                </Field>
              )}
            />
            <form.Field
              name="category_id"
              children={(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>Category</FieldLabel>
                  <Select
                    value={field.state.value.toString()}
                    onValueChange={(value) => {
                      field.handleChange(Number(value))
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a team" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem
                          key={category.id}
                          value={category.id.toString()}
                        >
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />
            {/* Team Selection */}
            <form.Field
              name="team_id"
              children={(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>Team</FieldLabel>
                  <Select
                    value={field.state.value.toString()}
                    onValueChange={(value) => {
                      field.handleChange(Number(value))
                      form.setFieldValue('localization_id', 0)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a team" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id.toString()}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />

            {/* Room / Lab Selection */}
            <form.Field
              name="localization_id"
              children={(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>Room / Lab</FieldLabel>
                  <Select
                    disabled={selectedTeam == 0}
                    value={field.state.value.toString()}
                    onValueChange={(value) => {
                      field.handleChange(Number(value))
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          selectedTeam == 0
                            ? 'Select a Team first'
                            : availableRooms.length === 0
                              ? 'No rooms for this team'
                              : 'Select a lab'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRooms.map((lab) => (
                        <SelectItem key={lab.id} value={lab.id.toString()}>
                          {lab.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                      <Plus />
                      Add Item
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
