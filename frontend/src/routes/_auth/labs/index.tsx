import { createFileRoute } from '@tanstack/react-router'
import { ArrowRight, Map, Server, User } from 'lucide-react'
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
                  Owner:{' '}
                  <span className="font-medium text-foreground">
                    "Adrian K."
                  </span>
                </CardDescription>
              </div>
              <CardAction>
                <Badge variant="outline">{lab.racks.length} Racks</Badge>
              </CardAction>
            </CardHeader>
            <CardContent className="p-0">
              <div className="flex items-center gap-2 mb-3 pb-3 px-6">
                <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                  Rack list
                </span>
                <div className="h-px bg-border flex-1" />
              </div>
              <ScrollArea className="w-full">
                <div className="flex w-max space-x-3 px-6 pb-4">
                  {lab.racks.map((rack) => (
                    <MapRedirectLink redirectId={rack.id} redirectType="rack">
                      <div className="group relative flex flex-col justify-between w-40 h-25 p-3 rounded-lg border bg-muted/30 hover:bg-primary/5 hover:border-primary/50 transition-all cursor-pointer">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-muted-foreground group-hover:text-primary transition-colors">
                            <Server className="h-4 w-4" />
                            <span className="text-xs font-medium">Rack ID</span>
                          </div>
                          <p className="font-mono text-sm font-bold truncate">
                            {rack.id}
                          </p>
                        </div>
                        <div className="flex justify-between items-center mt-auto pt-2">
                          <span className="text-[10px] text-muted-foreground">
                            {rack.machines.length} Machines
                          </span>
                          <ArrowRight className="h-3 w-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary" />
                        </div>
                      </div>
                    </MapRedirectLink>
                  ))}
                  {lab.racks.length === 0 && (
                    <div className="flex items-center justify-center w-40 h-25 text-xs text-muted-foreground border border-dashed rounded-lg">
                      No racks found
                    </div>
                  )}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </CardContent>

            <CardFooter>
              <Button asChild className="w-full">
                <MapRedirectLink redirectId={lab.id} redirectType="lab">
                  <Map className="mr-2 h-4 w-4" />
                  View lab on Map
                  <ArrowRight className="ml-auto h-4 w-4" />
                </MapRedirectLink>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </ScrollArea>
  )
}
