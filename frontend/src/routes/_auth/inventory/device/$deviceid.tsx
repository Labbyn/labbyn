import { Link, createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  ArrowLeft,
  CircleAlert,
  Cpu,
  MapPin,
  ShieldCheck,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { PageIsLoading } from '@/components/page-is-loading'
import { PageNotFound } from '@/components/page-not-found'
import { labs as mockLabs } from '@/lib/mock-data'

export const Route = createFileRoute('/_auth/inventory/device/$deviceid')({
  component: DeviceDetailComponent,
})

type EnrichedDevice = {
  device_id: string
  hostname: string
  device_type: string
  ip_address: string
  mac_address: string
  status: string
  labName: string
  rackId: string
}

const fetchDeviceById = async (id: string): Promise<EnrichedDevice | null> => {
  // Symulacja API
  await new Promise((resolve) => setTimeout(resolve, 400))

  // Szukamy urządzenia w zagnieżdżonej strukturze
  for (const lab of mockLabs) {
    for (const rack of lab.racks) {
      const device = rack.devices.find((d) => d.device_id === id)
      if (device) {
        return {
          ...device,
          labName: lab.name,
          rackId: rack.id,
        }
      }
    }
  }
  return null
}

function DeviceDetailComponent() {
  const { deviceid } = Route.useParams()

  const { data: device, isLoading } = useQuery({
    queryKey: ['device', deviceid],
    queryFn: () => fetchDeviceById(deviceid),
  })

  if (isLoading) return <PageIsLoading />
  if (!device) return <PageNotFound />

  const isOnline =
    device.status === 'Online' ||
    device.status === 'Running' ||
    device.status === 'Processing'
  const isWarning = device.status === 'Idle' || device.status === 'Standby'

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-4 border-b bg-background/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/inventory">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight">
              {device.hostname}
            </h1>
            <Badge
              variant={
                isOnline ? 'default' : isWarning ? 'secondary' : 'destructive'
              }
              className="ml-2"
            >
              {device.status}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-mono text-xs">{device.device_id}</span>
            <span>•</span>
            <span>{device.device_type}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Edit</Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-muted-foreground" />
                System Status
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 sm:grid-cols-2">
              <div className="grid gap-1">
                <span className="text-sm font-medium text-muted-foreground">
                  IP Address
                </span>
                <span className="text-lg font-mono">{device.ip_address}</span>
              </div>
              <div className="grid gap-1">
                <span className="text-sm font-medium text-muted-foreground">
                  MAC Address
                </span>
                <span className="text-lg font-mono">{device.mac_address}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                Physical Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-sm text-muted-foreground">
                  Laboratory
                </span>
                <span className="font-medium">{device.labName}</span>
              </div>
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-sm text-muted-foreground">Rack ID</span>
                <Link
                  to="/labs"
                  className="font-medium text-primary hover:underline"
                >
                  {device.rackId}
                </Link>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Rack Unit</span>
                <span className="font-medium">U-12</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="h-5 w-5 text-muted-foreground" />
                Specifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Manufacturer
                </span>
                <span className="font-medium">Dell Inc.</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Model</span>
                <span className="font-medium">PowerEdge R740</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Serial</span>
                <span className="font-mono text-xs">J9X22-11A</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                Security & Access
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-green-600">
                <ShieldCheck className="h-4 w-4" />
                Firmware Up-to-Date
              </div>
              <Separator />
              <div className="grid gap-1">
                <span className="text-sm font-medium text-muted-foreground">
                  Owner Team
                </span>
                <span className="font-medium">Infrastructure Ops</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
