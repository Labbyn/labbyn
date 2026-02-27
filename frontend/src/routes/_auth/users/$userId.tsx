import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  ClipboardList,
  Contact,
  ExternalLink,
  FileUser,
  Mail,
  UserSearch,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { singleUserQueryOptions } from '@/integrations/user/user.query'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export const Route = createFileRoute('/_auth/users/$userId')({
  component: InventoryDetailsPage,
})

function InventoryDetailsPage() {
  const router = useRouter()
  const { userId } = Route.useParams()
  const { data: user } = useSuspenseQuery(singleUserQueryOptions(userId))

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* Header */}
      <div className="flex items-center gap-4 bg-background/95 px-6 py-4 backdrop-blur sticky top-0 z-10">
        <Button
          onClick={() => router.history.back()}
          variant="ghost"
          size="icon"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold tracking-tight">User Details</h1>
      </div>
      <Separator />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto grid gap-6 md:grid-cols-3">
          {/* Main User Card with Avatar */}
          <Card className="md:col-span-2 pt-0">
            <CardHeader className="px-6 py-4 border-b bg-muted/30">
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-muted-foreground text-primary" />
                User informations
              </CardTitle>
              <CardDescription>General user information</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 flex flex-col sm:flex-row gap-8">
              {/* Avatar Section */}
              <div className="flex flex-col items-center space-y-3">
                <Avatar className="h-32 w-32 border-4 border-muted shadow-sm">
                  <AvatarImage src={user.avatar_url} alt={user.name} />
                  <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                    {user.name.charAt(0)}
                    {user.surname.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* Information Grid */}
              <div className="grid flex-1 gap-6 sm:grid-cols-2">
                {[
                  { label: 'E-mail', value: user.email, icon: Mail },
                  { label: 'Name', value: user.name, icon: Contact },
                  { label: 'Surname', value: user.surname, icon: Contact },
                  { label: 'Login', value: user.login, icon: FileUser },
                  {
                    label: 'User type',
                    value: user.user_type,
                    icon: UserSearch,
                  },
                ].map((field) => (
                  <div key={field.label} className="grid gap-1">
                    <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <field.icon className="h-4 w-4" /> {field.label}
                    </span>
                    <span className="font-semibold">{field.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Teams Card with Integrated Links */}
          <Card className="pt-0">
            <CardHeader className="px-6 py-4 border-b bg-muted/30">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground text-primary" />
                Team Memberships
              </CardTitle>
              <CardDescription>Manage and view team access</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-3">
              {user.membership.length > 0 ? (
                user.membership.map((group, index) => (
                  <Link
                    key={group.team_id}
                    to={user.group_links[index]}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent hover:text-accent-foreground transition-colors group"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="font-bold text-sm">
                        {group.team_name}
                      </span>
                      {group.is_group_admin && (
                        <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded w-fit font-bold uppercase">
                          Team Admin
                        </span>
                      )}
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </Link>
                ))
              ) : (
                <div className="text-center py-6 border-2 border-dashed rounded-lg">
                  <p className="text-sm text-muted-foreground italic">
                    No assigned teams
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
