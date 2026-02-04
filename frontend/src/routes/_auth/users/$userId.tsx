import { useState } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  Book,
  Check,
  ClipboardList,
  Contact,
  Edit2,
  FileUser,
  IdCard,
  Info,
  Mail,
  UserSearch,
  X,
} from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { singleUserQueryOptions } from '@/integrations/user/user.query'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

export const Route = createFileRoute('/_auth/users/$userId')({
  component: InventoryDetailsPage,
})

function InventoryDetailsPage() {
  const router = useRouter()
  const { userId } = Route.useParams()
  const { data: user } = useSuspenseQuery(singleUserQueryOptions(userId))

  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({ ...user })

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
              <h1 className="text-xl font-bold tracking-tight">{user.name}</h1>
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
                  setFormData({ ...user })
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
          {/* User Information*/}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-muted-foreground" />
                User
              </CardTitle>
              <CardDescription>User general information</CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="grid gap-6 sm:grid-cols-2">
              {[
                { label: 'ID', name: 'id', icon: IdCard },
                { label: 'E-mail', name: 'email', icon: Mail },
                {
                  label: 'Name',
                  name: 'name',
                  icon: Contact,
                },
                {
                  label: 'Surname',
                  name: 'surname',
                  icon: Contact,
                },
                { label: 'Login', name: 'login', icon: FileUser },
                { label: 'User type', name: 'user_type', icon: UserSearch },
              ].map((field) => {
                const rawValue = (user as any)[field.name]
                const displayValue =
                  typeof rawValue === 'boolean' ? rawValue.toString() : rawValue
                return (
                  <div key={field.name} className="grid gap-2">
                    <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <field.icon className="h-5 w-5" /> {field.label}
                    </span>
                    {isEditing ? (
                      <Input
                        name={field.name}
                        value={String((formData as any)[field.name] ?? '')}
                        onChange={handleInputChange}
                        className="h-8"
                      />
                    ) : (
                      <span className="font-medium">{displayValue}</span>
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {/* Other info*/}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-muted-foreground" />
                Additional informations
              </CardTitle>
              <CardDescription>Account details</CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  Is active
                </span>
                {isEditing ? (
                  <div className="h-8 flex items-center">
                    <Switch
                      checked={!!formData.is_active}
                      onCheckedChange={(checked) =>
                        handleSwitchChange('is_active', checked)
                      }
                    />
                  </div>
                ) : (
                  <span className="font-medium">
                    {user.is_verified ? 'Active' : 'Not Active'}
                  </span>
                )}
              </div>
              <Separator />
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  Is verified
                </span>
                {isEditing ? (
                  <div className="h-8 flex items-center">
                    <Switch
                      checked={!!formData.is_verified}
                      onCheckedChange={(checked) =>
                        handleSwitchChange('is_verified', checked)
                      }
                    />
                  </div>
                ) : (
                  <span className="font-medium">
                    {user.is_verified ? 'Verified' : 'Not Verified'}
                  </span>
                )}
              </div>
              <Separator />
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  Team ID
                </span>
                {isEditing ? (
                  <Input
                    name="team_id"
                    value={formData.team_id ?? ''}
                    onChange={handleInputChange}
                    className="h-8"
                  />
                ) : (
                  <span className="font-medium">{user.team_id}</span>
                )}
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
                <CardDescription>User links</CardDescription>
              </CardHeader>
              <Separator />
              <CardContent>
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    Team link
                  </span>
                  <Link to="/">Placeholder</Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
