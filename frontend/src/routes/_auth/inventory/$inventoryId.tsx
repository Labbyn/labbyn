import { useState } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import {
  BanknoteArrowUp,
  Book,
  ChartColumnStacked,
  ChevronRight,
  ClipboardList,
  Coins,
  MapPin,
  WeightTilde,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { inventoryItemInfoQueryOptions } from '@/integrations/inventory/inventory.query'
import { useUpdateInventoryMutation } from '@/integrations/inventory/inventory.mutation'
import { SubPageTemplate } from '@/components/subpage-template'
import { SubpageCard } from '@/components/subpage-card'

export const Route = createFileRoute('/_auth/inventory/$inventoryId')({
  component: InventoryDetailsPage,
})

function InventoryDetailsPage() {
  const router = useRouter()
  const { inventoryId } = Route.useParams()
  const { data: inventory } = useSuspenseQuery(
    inventoryItemInfoQueryOptions(inventoryId),
  )
  const updateMutation = useUpdateInventoryMutation(inventoryId)

  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({ ...inventory })

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSave = () => {
    updateMutation.mutate(
      { id: inventoryId, data: formData },
      { onSuccess: () => setIsEditing(false) },
    )
  }

  return (
    <SubPageTemplate
      headerProps={{
        title: inventory.name,
        type: 'editable',
        isEditing: isEditing,
        editValue: formData.name,
        onEditChange: (val) => setFormData((prev) => ({ ...prev, name: val })),
        onSave: handleSave,
        onCancel: () => {
          setFormData({ ...inventory })
          setIsEditing(false)
        },
        onStartEdit: () => setIsEditing(true),
      }}
      content={
        <div className="flex flex-col gap-6 w-full">
          {/* Item Information section */}
          <SubpageCard
            title="Item Information"
            description="Item general information"
            type="info"
            Icon={ClipboardList}
            className="w-full"
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
                ].map((field, index, array) => {
                  const rawValue = (inventory as any)[field.name]

                  return (
                    <div
                      key={field.name}
                      className={`flex flex-col gap-1.5 py-4 ${
                        index !== array.length - 1
                          ? 'border-b border-border/50'
                          : ''
                      }`}
                    >
                      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-tight text-muted-foreground/80">
                        <field.icon className="h-3.5 w-3.5" />
                        {field.label}
                      </div>

                      <div className="flex flex-col gap-2 min-h-[32px] justify-center">
                        {isEditing ? (
                          <Input
                            name={field.name}
                            value={String((formData as any)[field.name] ?? '')}
                            onChange={handleInputChange}
                            className="h-8 text-sm"
                          />
                        ) : (
                          <div className="text-sm font-medium text-foreground flex flex-col gap-1">
                            {field.isList && Array.isArray(rawValue) ? (
                              rawValue.map((item: any, i: number) => (
                                <div key={i}>{item}</div>
                              ))
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
            description="Rack and environment placement"
            type="info"
            Icon={MapPin}
            className="w-full"
            content={
              <div className="flex flex-col">
                {[
                  { label: 'Room Name', value: inventory.room_name },
                  { label: 'Machine Name', value: inventory.machine_info },
                  { label: 'Team Name', value: inventory.team_name },
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
            }
          />

          {/* Links section */}
          <SubpageCard
            title="Links"
            description="Quick access to associated resources"
            type="info"
            Icon={Book}
            className="w-full"
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
                    to={item.to}
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
