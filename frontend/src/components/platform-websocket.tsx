import { useEffect } from 'react'
import useWebSocket, { ReadyState } from 'react-use-websocket'
import { Activity, Cpu, MemoryStick, Server } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

export interface MetricsPayload {
  instance: string
  online: boolean
  cpu: number | null
  memory: number | null
  disks: Array<{ value: number; timestamp: number }>
}

export interface PlatformWebsocketProps {
  instance?: string
  variant?: 'default' | 'compact' | 'minimal'
  className?: string
}

export function usePlatformMetrics(instance?: string) {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
  const WS_URL = `${import.meta.env.VITE_WS_URL}/metrics?token=${token}&instance=${instance}:9100`

  const { sendJsonMessage, lastJsonMessage, readyState } = useWebSocket(
    WS_URL,
    {
      share: false,
      shouldReconnect: () => true,
    },
  )

  useEffect(() => {
    if (readyState === ReadyState.OPEN) {
      sendJsonMessage({
        event: 'subscribe',
        data: {
          channel: 'general',
        },
      })
    }
  }, [readyState, sendJsonMessage])

  return {
    metrics: lastJsonMessage as MetricsPayload | null,
    readyState,
    isConnected: readyState === ReadyState.OPEN,
  }
}

function getMetricColor(val: number | null) {
  if (val === null) {
    return {
      text: 'text-muted-foreground',
      bg: 'bg-muted/30',
      border: 'border-border/50',
      progress: 'bg-muted',
    }
  }
  if (val > 85) {
    return {
      text: 'text-destructive',
      bg: 'bg-destructive/10',
      border: 'border-destructive/20',
      progress: '[&>div]:bg-destructive',
    }
  }
  if (val > 65) {
    return {
      text: 'text-amber-500',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      progress: '[&>div]:bg-amber-500',
    }
  }
  return {
    text: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    progress: '[&>div]:bg-emerald-500',
  }
}

export function PlatformWebsocket({
  instance = 'Unknown',
  variant = 'default',
  className,
}: PlatformWebsocketProps) {
  const { metrics } = usePlatformMetrics(instance)

  if (!metrics) {
    if (variant === 'minimal') {
      return (
        <div
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-border/50 text-xs text-muted-foreground',
            className,
          )}
        >
          <div className="h-2 w-2 rounded-full bg-primary animate-ping" />
          <span>Connecting to {instance}...</span>
        </div>
      )
    }

    return (
      <Card
        className={cn(
          'w-full border-border/50 bg-card/50 backdrop-blur-xl shadow-sm',
          className,
        )}
      >
        <CardContent
          className={cn(
            'flex flex-col items-center justify-center gap-3',
            variant === 'compact' ? 'py-8' : 'py-16',
          )}
        >
          <div className="relative flex items-center justify-center">
            <div className="absolute h-10 w-10 rounded-full border-t-2 border-primary animate-spin" />
            <Activity className="h-4 w-4 text-primary animate-pulse" />
          </div>
          <span className="text-xs font-bold tracking-widest uppercase text-muted-foreground animate-pulse">
            Establishing Telemetry...
          </span>
        </CardContent>
      </Card>
    )
  }

  const { online, cpu, memory } = metrics
  const cpuColors = getMetricColor(cpu)
  const memColors = getMetricColor(memory)

  if (variant === 'minimal') {
    return (
      <div
        className={cn(
          'flex items-center flex-wrap gap-3 px-4 py-2 rounded-xl bg-card border border-border/50 text-xs',
          className,
        )}
      >
        <div className="flex items-center gap-2 font-bold text-foreground">
          <Server className="h-3 w-3 text-primary" />
          <span className="truncate max-w-[150px]">{instance}</span>
        </div>
        <div className="h-3 w-px bg-border/50" />
        <div
          className={`flex items-center gap-1.5 font-semibold ${online ? 'text-emerald-500' : 'text-destructive'}`}
        >
          <div
            className={`h-1.5 w-1.5 rounded-full ${online ? 'bg-emerald-500 animate-pulse' : 'bg-destructive'}`}
          />
          <span>{online ? 'ONLINE' : 'OFFLINE'}</span>
        </div>
        <div className="h-3 w-px bg-border/50" />
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground font-semibold">CPU:</span>
          <span className={`font-bold tabular-nums ${cpuColors.text}`}>
            {cpu !== null ? `${cpu.toFixed(0)}%` : 'N/A'}
          </span>
        </div>
        <div className="h-3 w-px bg-border/50" />
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground font-semibold">RAM:</span>
          <span className={`font-bold tabular-nums ${memColors.text}`}>
            {memory !== null ? `${memory.toFixed(0)}%` : 'N/A'}
          </span>
        </div>
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'flex flex-col rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl overflow-hidden shadow-sm space-y-4 p-4',
          className,
        )}
      >
        <div className="flex items-center justify-between pb-3 border-b border-border/50">
          <div className="flex items-center gap-2 min-w-0">
            <Activity className="h-4 w-4 text-primary shrink-0" />
            <span className="font-bold text-xs text-foreground truncate tracking-tight">
              {instance}
            </span>
          </div>
          <div
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest border ${online ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-destructive/10 text-destructive border-destructive/20'}`}
          >
            <div
              className={`h-1.5 w-1.5 rounded-full ${online ? 'bg-emerald-500 animate-pulse' : 'bg-destructive'}`}
            />
            <span>{online ? 'ON' : 'OFF'}</span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              <span className="flex items-center gap-1">
                <Cpu className="h-3 w-3" /> CPU Load
              </span>
              <span className={cpuColors.text}>
                {cpu !== null ? `${cpu.toFixed(1)}%` : 'N/A'}
              </span>
            </div>
            <Progress
              value={cpu || 0}
              className={`h-1.5 bg-background border border-border/50 ${cpuColors.progress}`}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              <span className="flex items-center gap-1">
                <MemoryStick className="h-3 w-3" /> RAM Alloc
              </span>
              <span className={memColors.text}>
                {memory !== null ? `${memory.toFixed(1)}%` : 'N/A'}
              </span>
            </div>
            <Progress
              value={memory || 0}
              className={`h-1.5 bg-background border border-border/50 ${memColors.progress}`}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <Card
      className={cn(
        'w-full border-border/50 shadow-xl bg-card/60 backdrop-blur-xl overflow-hidden',
        className,
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6 border-b border-border/50 bg-muted/10">
        <div className="flex flex-col gap-1.5 min-w-0 pr-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="p-1.5 bg-primary/20 rounded-lg shrink-0">
              <Activity className="h-4 w-4 text-primary" />
            </div>
            <span className="truncate">Live Telemetry</span>
          </CardTitle>
          <CardDescription className="font-medium tracking-tight truncate">
            Real-time resource utilization
          </CardDescription>
        </div>

        <div
          className={`flex shrink-0 items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border shadow-sm ${online ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-destructive/10 text-destructive border-destructive/20'}`}
        >
          <div
            className={`h-2 w-2 rounded-full ${online ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-destructive'}`}
          />
          <span>{online ? 'Online' : 'Offline'}</span>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col p-4 rounded-2xl border border-border/50 bg-background/50 space-y-3 justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Server className="h-3.5 w-3.5" /> Target Instance
            </span>
            <span className="text-xl font-bold tracking-tight truncate text-foreground">
              {instance}
            </span>
          </div>

          <div
            className={`flex flex-col p-4 rounded-2xl border transition-colors ${cpuColors.bg} ${cpuColors.border} space-y-3 justify-between`}
          >
            <div className="flex justify-between items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 shrink-0">
                <Cpu className="h-3.5 w-3.5" /> CPU Load
              </span>
              <span
                className={`text-lg font-bold tabular-nums tracking-tighter shrink-0 ${cpuColors.text}`}
              >
                {cpu !== null ? `${cpu.toFixed(1)}%` : 'N/A'}
              </span>
            </div>
            <Progress
              value={cpu || 0}
              className={`h-2 bg-background/50 ${cpuColors.progress}`}
            />
          </div>

          <div
            className={`flex flex-col p-4 rounded-2xl border transition-colors ${memColors.bg} ${memColors.border} space-y-3 justify-between`}
          >
            <div className="flex justify-between items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 shrink-0">
                <MemoryStick className="h-3.5 w-3.5" /> Mem Alloc
              </span>
              <span
                className={`text-lg font-bold tabular-nums tracking-tighter shrink-0 ${memColors.text}`}
              >
                {memory !== null ? `${memory.toFixed(1)}%` : 'N/A'}
              </span>
            </div>
            <Progress
              value={memory || 0}
              className={`h-2 bg-background/50 ${memColors.progress}`}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
