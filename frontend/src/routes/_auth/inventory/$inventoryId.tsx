import { useState } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useForm } from '@tanstack/react-form'
import {
  BanknoteArrowUp,
  Book,
  Calendar,
  ChartColumnStacked,
  ChevronRight,
  ClipboardList,
  Coins,
  MapPin,
  Package,
  Users,
  WeightTilde,
} from 'lucide-react'
import { toast } from 'sonner'
import type { ApiUpdateInventory } from '@/integrations/inventory/inventory.types'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { inventoryItemInfoQueryOptions } from '@/integrations/inventory/inventory.query'
import {
  useDeleteInventoryMutation,
  useUpdateInventoryMutation,
} from '@/integrations/inventory/inventory.mutation'
import { SubPageTemplate } from '@/components/subpage-template'
import { SubpageCard } from '@/components/subpage-card'
import { teamsQueryOptions } from '@/integrations/teams/teams.query'
import { labsBaseQueryOptions } from '@/integrations/labs/labs.query'
import { categoryListQueryOptions } from '@/integrations/category/category.query'
import { ManageRentalDialog } from '@/components/manage-rental-dialog'

export const Route = createFileRoute('/_auth/inventory/$inventoryId')({
  component: InventoryDetailsPage,
})

function InventoryDetailsPage() {
  const router = useRouter()
  const { inventoryId } = Route.useParams()

  const { data: inventory } = useSuspenseQuery(
    inventoryItemInfoQueryOptions(inventoryId),
  )

  const { data: rooms } = useSuspenseQuery(labsBaseQueryOptions)
  const { data: teams } = useSuspenseQuery(teamsQueryOptions)
  const { data: category } = useSuspenseQuery(categoryListQueryOptions)

  const updateItem = useUpdateInventoryMutation(inventoryId)
  const deleteItem = useDeleteInventoryMutation(inventoryId)
  const [isEditing, setIsEditing] = useState(false)
  const [isRentalDialogOpen, setIsRentalDialogOpen] = useState(false)

  const form = useForm({
    defaultValues: {
      ...inventory,
      team_id: (inventory as any).team_id ?? (undefined as number | undefined),
      category_id:
        (inventory as any).category_id ?? (undefined as number | undefined),
      rental_status: (inventory as any).rental_status ?? true,
      rental_id:
        (inventory as any).rental_id ?? (undefined as number | undefined),
    },
    onSubmit: ({ value }) => {
      const payload: ApiUpdateInventory = {
        name: value.name,
        quantity: Number(value.total_quantity || 0),
        team_id: value.team_id ? Number(value.team_id) : null,
        localization_id: value.room_id || 0,
        category_id: Number(value.category_id || 0),
        rental_status: value.rental_status ?? true,
        rental_id: value.rental_id ? Number(value.rental_id) : null,
      }
      updateItem.mutate(payload, {
        onSuccess: () => {
          toast.success('Inventory updated successfully')
          setIsEditing(false)
        },
        onError: (error: Error) => {
          toast.error('Update failed', { description: error.message })
        },
      })
    },
  })

  return (
    <SubPageTemplate
      headerProps={{
        title: inventory.name,
        type: 'editable',
        isEditing: isEditing,
        editValue: form.state.values.name,
        onEditChange: (val) => form.setFieldValue('name', val),
        onSave: (e) => {
          e.preventDefault()
          form.handleSubmit()
        },
        onCancel: () => {
          form.reset()
          setIsEditing(false)
        },
        onStartEdit: () => setIsEditing(true),
        onDelete: () => {
          deleteItem.mutate(undefined, {
            onSuccess: () => {
              toast.success('Item deleted successfully')
              router.history.back()
            },
            onError: (error: Error) => {
              toast.error('Operation failed', { description: error.message })
            },
          })
        },
      }}
      content={
        <div className="flex flex-col gap-6 w-full">
          {/* Item Information section */}
          <SubpageCard
            title="Item Information"
            description="Item general information"
            type="info"
            Icon={ClipboardList}
            content={
              <div className="flex flex-col">
                {[
                  {
                    label: 'Total quantity',
                    name: 'total_quantity',
                    icon: WeightTilde,
                  },
                  {
                    label: 'In stock quantity',
                    name: 'in_stock_quantity',
                    icon: Coins,
                  },
                  {
                    label: 'Category',
                    name: 'category_name',
                    icon: ChartColumnStacked,
                  },
                  {
                    label: 'Active rentals',
                    name: 'active_rentals',
                    icon: BanknoteArrowUp,
                    isList: true,
                  },
                ].map((formField, index, array) => {
                  const rawValue = (inventory as any)[formField.name]

                  return (
                    <div
                      key={formField.name}
                      className={`flex flex-col gap-1.5 py-4 ${
                        index !== array.length - 1
                          ? 'border-b border-border/50'
                          : ''
                      }`}
                    >
                      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-tight text-muted-foreground/80">
                        <formField.icon className="h-3.5 w-3.5" />
                        {formField.label}
                      </div>

                      <div className="flex flex-col gap-2 min-h-8 justify-center">
                        {isEditing && formField.name !== 'in_stock_quantity' ? (
                          formField.name === 'category_name' ? (
                            <form.Field
                              name="category_id"
                              children={(field) => (
                                <Select
                                  value={field.state.value?.toString() ?? ''}
                                  onValueChange={(value) =>
                                    field.handleChange(Number(value))
                                  }
                                >
                                  <SelectTrigger className="h-8 text-sm">
                                    <SelectValue placeholder="Select a category" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {category.map((cat: any) => (
                                      <SelectItem
                                        key={cat.id}
                                        value={cat.id.toString()}
                                      >
                                        {cat.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            />
                          ) : formField.name === 'active_rentals' ? (
                            <ManageRentalDialog
                              open={isRentalDialogOpen}
                              onOpenChange={setIsRentalDialogOpen}
                              item={inventory}
                            />
                          ) : (
                            <form.Field
                              name={formField.name}
                              children={(field) => (
                                <Input
                                  type="number"
                                  value={String(field.state.value ?? '')}
                                  onChange={(e) =>
                                    field.handleChange(e.target.value as any)
                                  }
                                  className="h-8 text-sm"
                                />
                              )}
                            />
                          )
                        ) : (
                          <div className="text-sm font-medium text-foreground flex flex-row">
                            {formField.name === 'active_rentals' ? (
                              <ScrollArea className="w-96 whitespace-nowrap">
                                <div className="flex w-max space-x-3 pb-3">
                                  {inventory.active_rentals.map((item, i) => (
                                    <Card
                                      key={i}
                                      className="flex flex-col w-40 shrink-0"
                                    >
                                      <CardContent className="flex flex-1 flex-col gap-2 p-3">
                                        <div className="flex flex-col">
                                          <span className="flex items-center text-[11px] font-medium uppercase text-muted-foreground">
                                            <Users className="mr-1.5 h-3 w-3 shrink-0" />
                                            Name
                                          </span>
                                          <span className="truncate text-sm font-medium text-foreground">
                                            {item.borrower_team}
                                          </span>
                                        </div>
                                        <div className="flex flex-col pt-2">
                                          <span className="flex items-center text-[11px] font-medium uppercase text-muted-foreground">
                                            <Package className="mr-1.5 h-3 w-3 shrink-0" />
                                            Quantity
                                          </span>
                                          <span className="text-sm font-medium text-foreground">
                                            {item.quantity}
                                          </span>
                                        </div>
                                        <div className="flex flex-col">
                                          <span className="flex items-center text-[11px] font-medium uppercase text-muted-foreground">
                                            <Calendar className="mr-1.5 h-3 w-3 shrink-0" />
                                            End date
                                          </span>
                                          <span className="text-sm font-medium text-foreground">
                                            {item.end_date}
                                          </span>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  ))}
                                </div>
                                <ScrollBar orientation="horizontal" />
                              </ScrollArea>
                            ) : (
                              <span className="truncate">
                                {rawValue || '—'}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            }
          />

          {/* Localization section */}
          <SubpageCard
            title="Localization"
            description="Inventory placement"
            type="info"
            Icon={MapPin}
            content={
              <div className="flex flex-col gap-4">
                {isEditing ? (
                  <div className="flex flex-col gap-4 py-2">
                    {/* Team Selection */}
                    <form.Field
                      name="team_id"
                      children={(field) => (
                        <>
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
                        </>
                      )}
                    />
                    <form.Field
                      name="room_id"
                      children={(field) => (
                        <>
                          <Select
                            value={field.state.value?.toString() ?? ''}
                            onValueChange={(value) => {
                              field.handleChange(Number(value))
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a room" />
                            </SelectTrigger>
                            <SelectContent>
                              {rooms.map((room) => (
                                <SelectItem
                                  key={room.id}
                                  value={room.id.toString()}
                                >
                                  {room.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </>
                      )}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col">
                    {[
                      { label: 'Team Name', value: inventory.team_name },
                      { label: 'Room Name', value: inventory.room_name },
                    ].map((item, index, array) => (
                      <div
                        key={item.label}
                        className={`flex flex-col gap-1.5 py-4 ${
                          index !== array.length - 1
                            ? 'border-b border-border/50'
                            : ''
                        }`}
                      >
                        <span className="text-[11px] font-bold uppercase tracking-tight text-muted-foreground/80">
                          {item.label}
                        </span>
                        <span className="text-sm font-medium text-foreground">
                          {item.value || '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            }
          />

          {/* Links section */}
          <SubpageCard
            title="Links"
            description="Quick access to associated resources"
            type="info"
            Icon={Book}
            content={
              <div className="flex flex-col gap-3">
                {[
                  {
                    label: 'Location link',
                    sub: 'Inventory placement',
                    to: inventory.location_link,
                  },
                ].map((item, index) => (
                  <Link
                    key={index}
                    to={item.to || '#'}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent hover:text-accent-foreground transition-colors group"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="font-bold text-sm tracking-tight">
                        {item.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold opacity-70">
                        {item.sub}
                      </span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                ))}
              </div>
            }
          />
        </div>
      }
    />
  )
}
