import { useState } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  BanknoteArrowUp,
  Book,
  ChartColumnStacked,
  Check,
  ClipboardList,
  Coins,
  Edit2,
  MapPin,
  WeightTilde,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { inventoryItemQueryOptions } from '@/integrations/inventory/inventory.query'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

export const Route = createFileRoute('/_auth/inventory/$inventoryId')({
  component: InventoryDetailsPage,
})

function InventoryDetailsPage() {
  const router = useRouter()
  const { inventoryId } = Route.useParams()
  const { data: inventory } = useSuspenseQuery(
    inventoryItemQueryOptions(inventoryId),
  )

  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({ ...inventory })

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: checked }))
  }

  const handleSave = () => {
    console.log('Saving inventory data:', formData)
    setIsEditing(false)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* Header*/}
      <div className="flex items-center gap-4 bg-background/95 px-6 py-4 backdrop-blur sticky top-0 z-10">
        <Button
          onClick={() => router.history.back()}
          variant="ghost"
          size="icon"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {isEditing ? (
              <Input
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="h-8"
              />
            ) : (
              <h1 className="text-xl font-bold tracking-tight">
                {inventory.name}
              </h1>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {!isEditing ? (
            <Button
              onClick={() => setIsEditing(true)}
              variant="outline"
              size="sm"
            >
              <Edit2 className="mr-2 h-4 w-4" /> Edit
            </Button>
          ) : (
            <>
              <Button
                onClick={() => {
                  setFormData({ ...inventory })
                  setIsEditing(false)
                }}
                variant="ghost"
                size="sm"
              >
                <X className="mr-2 h-4 w-4" /> Cancel
              </Button>
              <Button onClick={handleSave} variant="default" size="sm">
                <Check className="mr-2 h-4 w-4" /> Save
              </Button>
            </>
          )}
        </div>
      </div>
      <Separator />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto grid gap-6 md:grid-cols-3">
          {/* Item Information*/}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-muted-foreground" />
                Item Information
              </CardTitle>
              <CardDescription>Item general information</CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="grid gap-6 sm:grid-cols-2">
              {[
                { label: 'Quantity', name: 'quantity', icon: WeightTilde },
                {
                  label: 'Category',
                  name: 'category_id',
                  icon: ChartColumnStacked,
                },
                {
                  label: 'Is rented',
                  name: 'rental_status',
                  icon: BanknoteArrowUp,
                },
                { label: 'Rental ID', name: 'rental_id', icon: Coins },
              ].map((field) => {
                const isRented = field.name === 'rental_status'
                const displayValue = (inventory as any)[field.name]
                return (
                  <div key={field.name} className="grid gap-2">
                    <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <field.icon className="h-5 w-5" /> {field.label}
                    </span>
                    {isEditing ? (
                      isRented ? (
                        <Switch
                          checked={!!formData.rental_status}
                          onCheckedChange={(checked) =>
                            handleSwitchChange('rental_status', checked)
                          }
                        />
                      ) : (
                        <Input
                          name={field.name}
                          value={String((formData as any)[field.name] ?? '')}
                          onChange={handleInputChange}
                          className="h-8"
                        />
                      )
                    ) : (
                      <span className="font-medium">
                        {isRented
                          ? displayValue
                            ? 'Rented'
                            : 'Not Rented'
                          : displayValue}
                      </span>
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {/* Localization*/}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                Localization
              </CardTitle>
              <CardDescription>Item location and ownership</CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  Location ID
                </span>
                <span className="font-medium">{inventory.localization_id}</span>
              </div>
              <Separator />
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  Machine ID
                </span>
                <span className="font-medium">{inventory.machine_id}</span>
              </div>
              <Separator />
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  Team ID
                </span>
                <span className="font-medium">{inventory.team_id}</span>
              </div>
            </CardContent>
          </Card>

          <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Links */}
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Book className="h-5 w-5 text-muted-foreground" />
                  Links
                </CardTitle>
                <CardDescription>Item links</CardDescription>
              </CardHeader>
              <Separator />
              <CardContent>
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    Location link
                  </span>
                  <Link to="/">placeholder</Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
