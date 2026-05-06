import { Box, EthernetPort, Flame, Grid3X3, Map as MapIcon } from 'lucide-react'
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group'
import { Toggle } from '@/components/ui/toggle'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

type ViewOverlay = 'none' | 'heatmap' | 'network'

interface ViewSettingsProps {
  viewOverlay: ViewOverlay
  setViewOverlay: (v: ViewOverlay) => void
  useSnap: boolean
  setUseSnap: (v: boolean) => void
  is2D: boolean
  setIs2D: (v: boolean) => void
  projection: 'perspective' | 'orthographic'
  setProjection: (v: 'perspective' | 'orthographic') => void
}

export function ViewSettings({
  viewOverlay,
  setViewOverlay,
  useSnap,
  setUseSnap,
  is2D,
  setIs2D,
  projection,
  setProjection,
}: ViewSettingsProps) {
  return (
    <div className="backdrop-blur-xl bg-card/60 rounded-2xl border border-border/50 flex flex-col items-center p-1.5 shadow-2xl gap-2">
      
      {/* View Mode Group */}
      <ToggleGroup
        type="single"
        orientation="vertical"
        value={is2D ? '2D' : '3D'}
        onValueChange={(value) => value && setIs2D(value === '2D')}
        className="bg-background/50 rounded-full p-1 gap-1 flex flex-col"
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <ToggleGroupItem value="2D" className="h-8 w-8 rounded-full p-0">
              <MapIcon className="w-4 h-4" />
            </ToggleGroupItem>
          </TooltipTrigger>
          <TooltipContent side="left">2D View</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <ToggleGroupItem value="3D" className="h-8 w-8 rounded-full p-0">
              <Box className="w-4 h-4" />
            </ToggleGroupItem>
          </TooltipTrigger>
          <TooltipContent side="left">3D View</TooltipContent>
        </Tooltip>
      </ToggleGroup>

      <div className="h-px w-5 bg-border/50 my-1" />

      {/* Projection Group */}
      <ToggleGroup
        type="single"
        orientation="vertical"
        value={projection}
        onValueChange={(v) =>
          v && setProjection(v as 'perspective' | 'orthographic')
        }
        className="bg-background/50 rounded-full p-1 gap-1 flex flex-col"
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <ToggleGroupItem
              value="orthographic"
              className="h-8 w-8 p-0 rounded-full text-[10px] font-bold tracking-tighter"
            >
              ORT
            </ToggleGroupItem>
          </TooltipTrigger>
          <TooltipContent side="left">Orthographic</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <ToggleGroupItem
              value="perspective"
              className="h-8 w-8 p-0 rounded-full text-[10px] font-bold tracking-tighter"
            >
              PER
            </ToggleGroupItem>
          </TooltipTrigger>
          <TooltipContent side="left">Perspective</TooltipContent>
        </Tooltip>
      </ToggleGroup>

      <div className="h-px w-5 bg-border/50 my-1" />

      {/* Snap Toggle */}
      <div className="bg-background/50 rounded-full p-1 flex items-center justify-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle
              pressed={useSnap}
              onPressedChange={setUseSnap}
              className={`h-8 w-8 rounded-full p-0 transition-all ${
                useSnap 
                  ? 'bg-primary/20 text-primary shadow-sm' 
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
            </Toggle>
          </TooltipTrigger>
          <TooltipContent side="left">Snap to Grid</TooltipContent>
        </Tooltip>
      </div>

      <div className="h-px w-5 bg-border/50 my-1" />

      {/* Overlays Group */}
      <ToggleGroup
        type="single"
        orientation="vertical"
        value={viewOverlay}
        onValueChange={(v) => setViewOverlay(v as ViewOverlay)}
        className="bg-background/50 rounded-full p-1 gap-1 flex flex-col"
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <ToggleGroupItem value="heatmap" className="h-8 w-8 rounded-full p-0">
              <Flame
                className={
                  viewOverlay === 'heatmap' ? 'text-orange-500' : 'w-4 h-4'
                }
              />
            </ToggleGroupItem>
          </TooltipTrigger>
          <TooltipContent side="left">Thermal Heatmap</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <ToggleGroupItem value="network" className="h-8 w-8 rounded-full p-0">
              <EthernetPort
                className={
                  viewOverlay === 'network' ? 'text-blue-500' : 'w-4 h-4'
                }
              />
            </ToggleGroupItem>
          </TooltipTrigger>
          <TooltipContent side="left">Network Topology</TooltipContent>
        </Tooltip>
      </ToggleGroup>
    </div>
  )
}