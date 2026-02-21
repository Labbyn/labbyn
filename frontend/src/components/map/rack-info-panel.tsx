import React from 'react'
import {
  Activity,
  CheckCircle2,
  Cpu,
  Layers,
  Server,
  Thermometer,
  Wind,
  X,
  Zap,
} from 'lucide-react'
import type { Equipment } from '@/types/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { cn } from '@/lib/utils'

export function RackInfoPanel({
  rack,
  onClose,
}: {
  rack: Equipment
  onClose: () => void
}) {
  return (
    <aside className="absolute inset-y-0 right-0 z-50 flex h-full w-80 flex-col border border-border/40 backdrop-blur-md bg-card/50 shadow-2xl animate-in slide-in-from-right">
      <header className="flex shrink-0 items-start justify-between p-4">
        <div className="space-y-1">
          <h2 className="flex items-center gap-2 text-2xl font-semibold">
            {rack.label || 'Unnamed Rack'}
            <Server />
          </h2>
          <div className="flex gap-2">
            <Badge variant="secondary">{rack.type}</Badge>
            <Badge variant="destructive">#{rack.id.split('-')[0]}</Badge>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={onClose}
        >
          <X />
        </Button>
      </header>

      <ScrollArea className="flex-1">
        <div className="space-y-6 p-4">
          <Alert className="border-emerald-500/50 bg-emerald-500/15">
            <CheckCircle2 className=" text-emerald-500" />
            <AlertTitle className="font-bold uppercase tracking-widest text-emerald-500">
              System Healthy
            </AlertTitle>
            <AlertDescription className="text-muted-foreground">
              Uptime: 45d 12h
            </AlertDescription>
          </Alert>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Activity className="h-3 w-3" /> Real-time Sensors Data
              </h3>
            </div>

            <div className="grid grid-cols-3 gap-3 [&_svg]:h-5 [&_svg]:w-5">
              <MetricCard
                icon={<Thermometer className="text-orange-500" />}
                label="Inlet Temp"
                value="22°C"
              />

              <MetricCard
                icon={<Zap className="text-yellow-500" />}
                label="PUE Factor"
                value="1.14"
              />

              <MetricCard
                icon={<Wind className="text-blue-400" />}
                label="Airflow"
                value="450 CFM"
              />
            </div>
          </section>

          <Separator className="opacity-50" />

          <section className="space-y-3">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              <Layers className="h-3.5 w-3.5" /> Elevation
            </h3>
            <div className="space-y-px rounded-lg border border-border/40 bg-muted/10 p-1 font-mono">
              {Array.from({ length: 8 }).map((_, i) => (
                <ElevationRow
                  key={i}
                  index={i}
                  occupied={!(i === 2 || i === 5)}
                />
              ))}
            </div>
          </section>

          <div className="space-y-4">
            <section className="space-y-2">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Cpu className="h-3 w-3" /> CPU Load
                </span>
                <span className="text-primary">78%</span>
              </div>
              <Progress value={78} className="h-1 bg-muted/30" />
            </section>
          </div>
        </div>
      </ScrollArea>

      <footer className="shrink-0 border-t bg-muted/20 p-4">
        <Button
          className="h-9 w-full text-[10px] font-bold uppercase tracking-widest"
          size="sm"
        >
          Manage Infrastructure
        </Button>
      </footer>
    </aside>
  )
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <Card className="border-accent-foreground/50 bg-card/30 shadow-none p-3">
      <CardContent className="flex flex-col items-center text-center">
        <div className="mb-2 rounded-full border border-border/40 bg-background p-1.5">
          {icon}
        </div>
        <span className="text-lg font-bold tracking-tighter tabular-nums leading-none">
          {value}
        </span>
        <span className="mt-1 text-[8px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          {label}
        </span>
      </CardContent>
    </Card>
  )
}

function ElevationRow({
  index,
  occupied,
}: {
  index: number
  occupied: boolean
}) {
  return (
    <div className="group flex h-7 items-center gap-2">
      <span className="w-4 text-right tabular-nums text-[10px] text-muted-foreground/70">
        {42 - index * 3}
      </span>
      <div
        className={cn(
          'flex-1 h-full rounded-sm border transition-all',
          occupied
            ? 'bg-background border-border shadow-sm'
            : 'border-dashed border-border/20',
        )}
      >
        {occupied && (
          <div className="flex h-full items-center gap-2 px-2">
            <div className="h-1 w-1 rounded-full bg-emerald-500 shadow-[0_0_4px_var(--color-emerald-500)]" />
            <span className="truncate text-[9px] font-medium uppercase text-foreground/80">
              Node-{index}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
