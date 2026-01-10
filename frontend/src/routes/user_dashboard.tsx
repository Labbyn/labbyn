import { useEffect } from 'react'
import {
  Link,
  createFileRoute,
  useNavigate,
} from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import {
  Archive,
  ArrowRight,
  Database,
  Map,
  Plus,
  Server,
  User,
  Users,
} from 'lucide-react'
import { dashboardQueryOptions } from '@/integrations/user_dashboard/user_dashboard.query'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

type DashboardSearch = {
  views: Array<string>
}

const DEFAULT_DASHBOARD_VIEWS = [
  'Machines',
  'Rooms',
  'Inventory',
  'Teams',
  'Users',
  'History',
]

const IconMap = {
  Room: Database,
  Server: Server,
  History: Map,
  User: User,
  Team: Users,
  Inventory: Archive,
}

export const Route = createFileRoute('/user_dashboard')({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>): DashboardSearch => {
    if (Array.isArray(search.views)) {
      return { views: search.views as Array<string> }
    }

    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dashboard_views')
      if (saved) {
        try {
          return { views: JSON.parse(saved) }
        } catch (e) {
          console.log(e)
        }
      }
    }

    return {
      views: DEFAULT_DASHBOARD_VIEWS,
    }
  },
})

function RouteComponent() {
  const { views } = Route.useSearch()
  const navigate = useNavigate()
  
  useEffect(() => {
    if (views && views.length > 0) {
      localStorage.setItem('dashboard_views', JSON.stringify(views))
    }
  }, [views])

  const { data: dashboardData } = useSuspenseQuery(dashboardQueryOptions)

  const visibleDashboardData = dashboardData.filter((section) =>
    views.includes(section.name),
  )

  return (
    <ScrollArea className="h-screen w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 p-6 w-full">
        {visibleDashboardData.map((data) => (
          <Card key={data.name}>
            <CardHeader>
              <div className="space-y-1">
                <CardTitle className="text-xl font-bold text-primary">
                  {data.name}
                </CardTitle>
                <CardDescription className="flex items-center gap-1.5 text-xs">
                  <User className="h-3 w-3" />
                  Owner:{' '}
                  <span className="font-medium text-foreground">User1</span>
                </CardDescription>
              </div>
              <CardAction>
                <Badge variant="outline">Custom</Badge>
              </CardAction>
            </CardHeader>
            <CardContent className="p-0">
              <div className="flex items-center gap-2 mb-3 pb-3 px-6">
                <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                  Items
                </span>
                <div className="h-px bg-border flex-1" />
              </div>
              <ScrollArea className="h-62.5 w-full">
                <div className="flex flex-col space-y-3 w-full px-4 py-2">
                  {data.pages.map((page, idx) => (
                    <Link
                      key={`${page.description.id}-${idx}`}
                      to={page.description.location}
                    >
                      <div className="group relative flex flex-row items-center justify-between w-full h-17.5 p-3 rounded-lg border bg-muted/30 hover:bg-primary/5 hover:border-primary/50 transition-all cursor-pointer">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-muted-foreground group-hover:text-primary transition-colors">
                            {(() => {
                              const Icon =
                                IconMap[page.type as keyof typeof IconMap]
                              return <Icon className="h-4 w-4" />
                            })()}
                            <span className="text-xs font-medium">
                              {page.type} {page.description.id}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {page.description.tags.map((tag) => (
                              <Badge
                                key={tag}
                                variant="secondary"
                                className="text-[10px] px-1.5 py-0 font-normal h-4 "
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex justify-between items-center mt-auto pt-2">
                          <ArrowRight className="h-3 w-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
                <ScrollBar orientation="vertical" />
              </ScrollArea>
            </CardContent>
          </Card>
        ))}

        <Dialog>
          <DialogTrigger asChild>
            <Card className="flex items-center justify-center cursor-pointer hover:border-primary/50 transition min-h-75">
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Plus className="h-6 w-6" />
                <span className="text-sm font-medium">Customize View</span>
              </div>
            </Card>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>Customize Dashboard</DialogTitle>
            </DialogHeader>

            <div className="space-y-3">
              {dashboardData.map((section) => {
                const enabled = views.includes(section.name)

                return (
                  <div
                    key={section.name}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm">{section.name}</span>
                    <Checkbox
                      className="cursor-pointer"
                      checked={enabled}
                      onCheckedChange={(checked) => {
                        navigate({
                          search: (prev) => {
                            const currentViews = prev.views || []
                            return {
                              ...prev,
                              views: checked
                                ? [...currentViews, section.name]
                                : currentViews.filter(
                                    (v) => v !== section.name
                                  ),
                            }
                          },
                        })
                      }}
                    />
                  </div>
                )
              })}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ScrollArea>
  )
}
