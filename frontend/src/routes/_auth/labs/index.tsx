import { useMemo, useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowRight, Search, Server, Settings, User } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { PageIsLoading } from '@/components/page-is-loading'
import { labsQueryOptions } from '@/integrations/labs/labs.query'
import { PageHeader } from '@/components/page-header'
import { ShowOnMapButton } from '@/components/map/show-on-map-button'

export const Route = createFileRoute('/_auth/labs/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { data: labs = [], isLoading } = useQuery(labsQueryOptions)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredLabs = useMemo(() => {
    if (!searchQuery.trim()) return labs

    const lowerQuery = searchQuery.toLowerCase()
    return labs.filter(
      (lab) =>
        lab.name.toLowerCase().includes(lowerQuery) ||
        lab.team_name.toLowerCase().includes(lowerQuery),
    )
  }, [labs, searchQuery])

  if (isLoading) return <PageIsLoading />

  return (
    <div className="space-y-6 p-6 pb-0">
      {/* Header and Search Bar Container */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Labs"
          description="All accessible labs and rooms"
          icon={Server}
        />

        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by lab or team name..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Grid or Empty State */}
      {filteredLabs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-lg border border-dashed">
          <Server className="h-10 w-10 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold text-foreground">
            No labs found
          </h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            We couldn't find any labs matching "{searchQuery}".
          </p>
          <Button variant="outline" onClick={() => setSearchQuery('')}>
            Clear search
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6 w-full">
          {filteredLabs.map((lab) => (
            <Card
              key={lab.id}
              className="flex flex-col h-full hover:shadow-md transition-shadow duration-200"
            >
              <CardHeader className="flex-none">
                <div className="space-y-1">
                  <CardTitle className="text-xl font-bold text-primary truncate">
                    {lab.name}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-1.5 text-xs">
                    <User className="h-3 w-3 shrink-0" />
                    Owner:
                    <span className="font-medium text-foreground truncate">
                      {lab.team_name}
                    </span>
                  </CardDescription>
                </div>
                <CardAction>
                  <Badge variant="outline">{lab.rack_count} Racks</Badge>
                </CardAction>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col justify-end p-0 mt-auto">
                <Separator />
                <div className="flex flex-col gap-2 p-4">
                  <Button asChild className="w-full justify-between">
                    <Link to="/labs/$labId" params={{ labId: String(lab.id) }}>
                      <span className="flex items-center">
                        <Settings className="mr-2 h-4 w-4" />
                        Room details
                      </span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  </Button>
                  <ShowOnMapButton
                    type="lab"
                    roomId={lab.id}
                    variant="link"
                    className="w-full"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
