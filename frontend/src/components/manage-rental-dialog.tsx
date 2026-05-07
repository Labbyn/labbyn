import React, { useState } from 'react'
import { Loader2, Plus, ToolCase } from 'lucide-react'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Card, CardContent, CardFooter, CardTitle } from "@/components/ui/card"
import { toast } from 'sonner'
import { Separator } from './ui/separator'
import { z } from 'zod'
import { DeleteAlertDialog } from '@/components/delete-alert-dialog'
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { format } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { SidebarMenuButton } from '@/components/ui/sidebar'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useCreateRentalMutation, useDeleteRentalMutation } from '@/integrations/rentals/rentals.mutation'
import { zodValidate } from '@/utils/index'
import { teamsQueryOptions } from '@/integrations/teams/teams.query'
import { labsBaseQueryOptions } from '@/integrations/labs/labs.query'

type RentalFormValues = {
  item_id: number,
  start_date: string,
  end_date: string,
  quantity: number,
  team_id: number
}

export function ManageRentalDialog({
  item
}: {
  item?: React.ReactNode
}) {
  
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data: teams } = useSuspenseQuery(teamsQueryOptions)
  const { data: labs } = useSuspenseQuery(labsBaseQueryOptions)

  const deleteMutation = useDeleteRentalMutation(item.id)
  const createMutation = useMutation({
    mutationKey: ['create-rental'],
    mutationFn: useCreateRentalMutation,
    onSuccess: () => {
      toast.success('Rental added successfully')
      queryClient.invalidateQueries({ queryKey: ['rentals'] })
      setOpen(false)
      form.reset()
    },
    onError: (error: Error) => {
      toast.error('Operation failed', { description: error.message })
    },
  })
  
  const form = useForm({
    defaultValues: {
      item_id: item.id,
      start_date: "",
      end_date: "",
      quantity: 0,
      team_id: 0
    } as RentalFormValues,
    onSubmit: async ({ value }) => {
      await createMutation.mutateAsync(value)
    },
  })

    const handleDelete = (rentId: string) => {
      console.log("delete");
      
      deleteMutation.mutate(rentId)
    }
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
            {item.active_rentals && item.active_rentals.length > 0 ? (
              <>
            <p className="text-sm font-medium mb-3">Current rentals</p>
            <ScrollArea className="w-96 h-55 whitespace-nowrap">
            
            <div className="flex w-max space-x-3 pb-3">
            {item.active_rentals.map((item, idx) => (
              <Card key={idx} className="w-40 h-40 shrink-0">
                <CardContent className="pl-3 flex flex-col">
                      <span className="text-xs font-medium uppercase text-muted-foreground block">Name</span>
                      <span className="text-foreground">{item.borrower_team}</span>
                      <span className="text-xs font-medium uppercase text-muted-foreground block">Quantity</span>
                      <span className="text-foreground">{item.quantity}</span>
                      <span className="text-xs font-medium uppercase text-muted-foreground block">End date</span>
                      <span className="text-foreground">{item.end_date}</span>
                  </CardContent>
                  <CardFooter>
                    <DeleteAlertDialog onDelete={() => handleDelete(item.id)} />
                  </CardFooter>
                  </Card>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
          </ScrollArea>
          </>
            ) : (
              <p className="text-muted-foreground">No current rentals available.</p>
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
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(Number(e.target.value))}
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
                                value={field.state.value?.toString() ?? ''}
                                onValueChange={(value) => {
                                  field.handleChange(Number(value))
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a team" />
                                </SelectTrigger>
                                <SelectContent>
                                  {teams.map((team) => (
                                    <SelectItem
                                      key={team.id}
                                      value={team.id.toString()}
                                    >
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
                                  {field.state.value ? format(field.state.value, "PPP") : <span>Pick start date</span>}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.state.value}
                                  onSelect={(date) => field.handleChange(format(date, "yyyy-MM-dd"))}
                                  defaultMonth={field.state.value}
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
                                  {field.state.value ? format(field.state.value, "PPP") : <span>Pick end date</span>}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.state.value}
                                  onSelect={(date) => field.handleChange(format(date, "yyyy-MM-dd"))}
                                  defaultMonth={field.state.value}
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
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <form.Subscribe
              selector={(state) => [state.canSubmit]}
              children={([canSubmit]) => (
                <Button
                  type="submit"
                  disabled={!canSubmit || createMutation.isPending}
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Create new rental
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
