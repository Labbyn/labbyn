import { Calendar as Calendar1, Loader2, Package, Users } from 'lucide-react'
import { useForm } from '@tanstack/react-form'
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Separator } from './ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'

import type { ApiInventoryInfoItem } from '@/integrations/inventory/inventory.types'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { DeleteAlertDialog } from '@/components/delete-alert-dialog'
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  useCreateRentalMutation,
  useDeleteRentalMutation,
} from '@/integrations/rentals/rentals.mutation'
import { teamsQueryOptions } from '@/integrations/teams/teams.query'

type RentalFormValues = {
  item_id: number
  start_date: string
  end_date: string
  quantity: number | null
  team_id: number
}

interface ManageRentalDialogProps {
  item: ApiInventoryInfoItem
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ManageRentalDialog({
  item,
  open,
  onOpenChange,
}: ManageRentalDialogProps) {
  const queryClient = useQueryClient()

  const { data: teams } = useSuspenseQuery(teamsQueryOptions)

  const deleteMutation = useDeleteRentalMutation(item.id.toString())
  const createMutation = useMutation({
    mutationKey: ['create-rental'],
    mutationFn: useCreateRentalMutation,
    onSuccess: () => {
      toast.success('Rental added successfully')
      queryClient.invalidateQueries({ queryKey: ['rentals'] })
      onOpenChange(false)
      form.reset()
    },
  })

  const form = useForm({
    defaultValues: {
      item_id: item.id,
      start_date: '',
      end_date: '',
      quantity: null,
      team_id: 0,
    } as RentalFormValues,
    onSubmit: async ({ value }) => {
      await createMutation.mutateAsync(value)
    },
  })

  const handleDelete = (rentId: number) => {
    deleteMutation.mutate(rentId)
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <div>
          <Button variant="outline" type="button">
            Manage rentals
          </Button>
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
            {item.active_rentals.length > 0 ? (
              <>
                <p className="text-sm font-medium mb-3">Current rentals</p>
                <ScrollArea className="w-96 h-55 pb-4 whitespace-nowrap">
                  <div className="flex w-max space-x-3 pb-3">
                    {item.active_rentals.map((rent_item, idx) => (
                      <Card key={idx} className="flex flex-col w-40 shrink-0">
                        <CardContent className="flex flex-1 flex-col gap-2 p-3">
                          <div className="flex flex-col">
                            <span className="flex items-center text-[11px] font-medium uppercase text-muted-foreground">
                              <Users className="mr-1.5 h-3 w-3 shrink-0" />
                              Name
                            </span>
                            <span className="truncate text-sm font-medium text-foreground">
                              {rent_item.borrower_team}
                            </span>
                          </div>
                          <div className="flex flex-col pt-2">
                            <span className="flex items-center text-[11px] font-medium uppercase text-muted-foreground">
                              <Package className="mr-1.5 h-3 w-3 shrink-0" />
                              Quantity
                            </span>
                            <span className="text-sm font-medium text-foreground">
                              {rent_item.quantity}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="flex items-center text-[11px] font-medium uppercase text-muted-foreground">
                              <Calendar1 className="mr-1.5 h-3 w-3 shrink-0" />
                              End date
                            </span>
                            <span className="text-sm font-medium text-foreground">
                              {rent_item.end_date}
                            </span>
                          </div>
                        </CardContent>
                        <CardFooter className="p-3 pt-0 flex justify-center">
                          <DeleteAlertDialog
                            onDelete={() => handleDelete(rent_item.id)}
                          />
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                  <Separator />
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </>
            ) : (
              <p className="text-muted-foreground">
                No current rentals available.
              </p>
            )}
          </div>
          <div className="max-h-[60vh] overflow-y-auto space-y-4 py-3 mb-6">
            <p className="text-sm font-medium mb-3">Add new rental</p>
            {/* New rental object */}
            <form.Field
              name="quantity"
              children={(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>Quantity</FieldLabel>
                  <Input
                    id={field.name}
                    value={
                      field.state.value == null ? '' : String(field.state.value)
                    }
                    onBlur={field.handleBlur}
                    onChange={(e) =>
                      field.handleChange(
                        e.target.value === '' ? null : Number(e.target.value),
                      )
                    }
                    type="number"
                    min="0"
                    className={
                      field.state.meta.errors.length ? 'border-destructive' : ''
                    }
                  />
                  <FieldError errors={field.state.meta.errors} />
                </Field>
              )}
            />
            <form.Field
              name="team_id"
              children={(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>Team name</FieldLabel>
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
            <div className="grid grid-cols-2 gap-4 w-full">
              <form.Field
                name="start_date"
                children={(field) => (
                  <Field className="w-full">
                    <FieldLabel htmlFor={field.name}>Start date</FieldLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          id="date-picker-simple"
                          className="justify-start font-normal"
                        >
                          {field.state.value ? (
                            format(new Date(field.state.value), 'PPP')
                          ) : (
                            <span>Pick start date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={
                            field.state.value
                              ? new Date(field.state.value)
                              : undefined
                          }
                          onSelect={(date) =>
                            field.handleChange(
                              date ? format(date, 'yyyy-MM-dd') : '',
                            )
                          }
                          defaultMonth={
                            field.state.value
                              ? new Date(field.state.value)
                              : undefined
                          }
                        />
                      </PopoverContent>
                    </Popover>
                  </Field>
                )}
              />
              <form.Field
                name="end_date"
                children={(field) => (
                  <Field className="w-full">
                    <FieldLabel htmlFor={field.name}>End date</FieldLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          id="date-picker-simple"
                          className="justify-start font-normal"
                        >
                          {field.state.value ? (
                            format(new Date(field.state.value), 'PPP')
                          ) : (
                            <span>Pick end date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={
                            field.state.value
                              ? new Date(field.state.value)
                              : undefined
                          }
                          onSelect={(date) =>
                            field.handleChange(
                              date ? format(date, 'yyyy-MM-dd') : '',
                            )
                          }
                          defaultMonth={
                            field.state.value
                              ? new Date(field.state.value)
                              : undefined
                          }
                        />
                      </PopoverContent>
                    </Popover>
                  </Field>
                )}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <form.Subscribe
              selector={(state) => [
                state.values.start_date,
                state.values.end_date,
                state.values.quantity,
                state.values.team_id,
                state.canSubmit,
              ]}
              children={([
                start_date,
                end_date,
                quantity,
                team_id,
                canSubmit,
              ]) => {
                const requiredFieldsSet =
                  !!start_date && !!end_date && quantity != null && Number(team_id) !== 0
                const disabled = !requiredFieldsSet || !canSubmit || createMutation.isPending
                return (
                  <Button type="submit" disabled={disabled}>
                    {createMutation.isPending ? (
                      <>
                        <Loader2 className="animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>Create new rental</>
                    )}
                  </Button>
                )
              }}
            />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
