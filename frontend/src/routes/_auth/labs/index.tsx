import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowRight, Map, Server, Settings, User } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { PageIsLoading } from '@/components/page-is-loading'
import { labsQueryOptions } from '@/integrations/labs/labs.query'
import { MapRedirectLink } from '@/components/map-redirect-link'
import { Separator } from '@/components/ui/separator'

export const Route = createFileRoute('/_auth/labs/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { data: labs = [], isLoading } = useQuery(labsQueryOptions)

  if (isLoading) return <PageIsLoading />

  return (
    <ScrollArea className="h-screen w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 p-6 w-full">
        {labs.map((lab) => (
          <Card>
            <CardHeader>
              <div className="space-y-1">
                <CardTitle className="text-xl font-bold text-primary">
                  {lab.name}
                </CardTitle>
                <CardDescription className="flex items-center gap-1.5 text-xs">
                  <User className="h-3 w-3" />
                  Owner:
                  <span className="font-medium text-foreground">
                    {lab.team_name}
                  </span>
                </CardDescription>
              </div>
              <CardAction>
                <Badge variant="outline">{lab.rack_count} Racks</Badge>
              </CardAction>
            </CardHeader>
            <CardContent className="p-0">
              <Separator />
              <div className="flex flex-col items-center gap-2 mb-3 pb-3 px-6 mt-6">
                <Button asChild className="w-full">
                  <Link to={`/labs/${lab.id}`}>
                    <Settings className="mr-2 h-4 w-4" />
                    Room details
                    <ArrowRight className="ml-auto h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild className="w-full">
                  <MapRedirectLink redirectId={lab.map_link} redirectType="lab">
                    <Map className="mr-2 h-4 w-4" />
                    View lab on Map
                    <ArrowRight className="ml-auto h-4 w-4" />
                  </MapRedirectLink>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  )
}
