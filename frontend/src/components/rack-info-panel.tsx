import {
  Cable,
  CheckCircle2,
  Cpu,
  Layers,
  Server,
  Thermometer,
  X,
  Zap,
} from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { Badge } from './ui/badge'
import { ScrollArea } from './ui/scroll-area'
import { Separator } from './ui/separator'
import { Progress } from './ui/progress'
import type { Equipment } from '@/types/types'

interface RackInfoPanelProps {
  rack: Equipment
  onClose: () => void
}

export function RackInfoPanel({ rack, onClose }: RackInfoPanelProps) {
  return (
    <div className="absolute right-0 top-0 bottom-0 w-[320px] z-50 bg-card border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right-10 duration-200 h-full">
      <div className="p-4 border-b border-border bg-muted/20 shrink-0">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2 text-foreground">
              <Server className="w-5 h-5 text-primary" />
              {rack.label}
            </h2>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-[10px]">
                {rack.type}
              </Badge>
              <Badge variant="secondary" className="text-[10px]">
                #{rack.id}
              </Badge>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 w-full overflow-hidden">
        <div className="p-4 space-y-6">
          <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/20 p-3 rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <div>
              <div className="text-sm font-semibold text-green-500">
                System Healthy
              </div>
              <div className="text-[10px] text-muted-foreground">
                Uptime: 45d 12h
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Card className="bg-background border-border">
              <CardContent className="p-3 flex flex-col items-center text-center">
                <Thermometer className="w-4 h-4 text-orange-500 mb-1" />
                <span className="text-xl font-bold">22°C</span>
                <span className="text-[10px] text-muted-foreground">
                  Intake
                </span>
              </CardContent>
            </Card>
            <Card className="bg-background border-border">
              <CardContent className="p-3 flex flex-col items-center text-center">
                <Zap className="w-4 h-4 text-yellow-500 mb-1" />
                <span className="text-xl font-bold">
                  1.8<span className="text-xs">kW</span>
                </span>
                <span className="text-[10px] text-muted-foreground">Load</span>
              </CardContent>
            </Card>
          </div>

          <Separator className="bg-border" />

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" /> Rack Elevation
              </h3>
              <span className="text-[10px] text-muted-foreground">42U</span>
            </div>
            <div className="border border-border rounded-md bg-background p-1 space-y-px font-mono text-xs">
              {Array.from({ length: 14 }).map((_, i) => (
                <div key={i} className="flex h-6 gap-2 items-center group">
                  <div className="w-6 text-[9px] text-muted-foreground text-right opacity-50">
                    {42 - i * 3}
                  </div>
                  <div
                    className={`flex-1 h-full rounded-[2px] flex items-center px-2 transition-colors ${
                      i === 2 || i === 8
                        ? 'bg-muted/30'
                        : 'bg-primary/10 border border-primary/20 hover:bg-primary/20 cursor-pointer'
                    }`}
                  >
                    {!(i === 2 || i === 8) && (
                      <>
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 mr-2 shadow-[0_0_4px_rgba(34,197,94,0.6)]"></div>
                        <span className="text-[9px] text-foreground/90 truncate font-medium">
                          SRV-BLADE-{(i + 1).toString().padStart(2, '0')}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator className="bg-border" />

          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-2">
                <Cable className="w-3 h-3" /> Power Distribution
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between text-xs bg-muted/30 p-2 rounded">
                  <span>PDU-A (L1)</span>
                  <span className="font-mono">12.4A</span>
                </div>
                <div className="flex justify-between text-xs bg-muted/30 p-2 rounded">
                  <span>PDU-B (L2)</span>
                  <span className="font-mono">8.1A</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Cpu className="w-3 h-3" /> CPU Aggregated
                </span>
                <span className="font-mono">78%</span>
              </div>
              <Progress value={78} className="h-1.5" />
            </div>
          </div>
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-border bg-muted/10 shrink-0">
        <Button className="w-full" size="sm">
          Manage Device
        </Button>
      </div>
    </div>
  )
}
