import {
  Box,
  EthernetPort,
  Flame,
  Grid3X3,
  Map as MapIcon,
  Redo2,
  Undo2,
} from 'lucide-react'
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group'
import { ButtonGroup } from '../ui/button-group'
import { Button } from '@/components/ui/button'
import { Toggle } from '@/components/ui/toggle'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

type ViewOverlay = 'none' | 'heatmap' | 'network'

interface ViewSettingsProps {
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
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
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  viewOverlay,
  setViewOverlay,
  useSnap,
  setUseSnap,
  is2D,
  setIs2D,
  projection,
  setProjection
}: ViewSettingsProps) {
  return (
    <TooltipProvider delayDuration={0}>
      <div className="p-1.5 backdrop-blur-md bg-card/30 rounded-xl border border-border/40 flex items-center gap-2 shadow-2xl">
        {/* View Mode Group */}
        <ToggleGroup
          type="single"
          value={is2D ? '2D' : '3D'}
          onValueChange={(value) => {
            if (value) setIs2D(value === '2D')
          }}
          variant={'outline'}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <ToggleGroupItem value="2D">
                <MapIcon /> 2D
              </ToggleGroupItem>
            </TooltipTrigger>
            <TooltipContent>2D Top-down View</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <ToggleGroupItem value="3D">
                <Box /> 3D
              </ToggleGroupItem>
            </TooltipTrigger>
            <TooltipContent>3D Perspective View</TooltipContent>
          </Tooltip>
        </ToggleGroup>

        {/* Camera Projection Group */}
        <ToggleGroup 
          type="single" 
          variant={'outline'}
          value={projection}
          onValueChange={(v) => v && setProjection(v as 'perspective' | 'orthographic')}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <ToggleGroupItem value="orthographic">Ort</ToggleGroupItem>
            </TooltipTrigger>
            <TooltipContent>Orthographic Camera</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <ToggleGroupItem value="perspective">Pers</ToggleGroupItem>
            </TooltipTrigger>
            <TooltipContent>Perspective Camera</TooltipContent>
          </Tooltip>
        </ToggleGroup>

        {/* Overlay Group */}
        <ToggleGroup
          type="single"
          value={viewOverlay}
          variant={'outline'}
          onValueChange={(v) => setViewOverlay(v as ViewOverlay)}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <ToggleGroupItem value="heatmap">
                <Flame
                  className={
                    viewOverlay === 'heatmap' ? 'text-orange-500' : 'text'
                  }
                />
              </ToggleGroupItem>
            </TooltipTrigger>
            <TooltipContent>Thermal Heatmap</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <ToggleGroupItem value="network">
                <EthernetPort
                  className={
                    viewOverlay === 'network' ? 'text-blue-500' : 'text'
                  }
                />
              </ToggleGroupItem>
            </TooltipTrigger>
            <TooltipContent>Network Topology</TooltipContent>
          </Tooltip>
        </ToggleGroup>

        {/* Snap Toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle
              pressed={useSnap}
              onPressedChange={setUseSnap}
              variant={'outline'}
            >
              <Grid3X3 className={useSnap ? 'text-primary' : ''} />
            </Toggle>
          </TooltipTrigger>
          <TooltipContent>Snap to Grid</TooltipContent>
        </Tooltip>

        {/* History Group */}
        <ButtonGroup>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant={'outline'}
                onClick={onUndo}
                disabled={!canUndo}
              >
                <Undo2 />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Undo</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant={'outline'}
                onClick={onRedo}
                disabled={!canRedo}
              >
                <Redo2 />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Redo</TooltipContent>
          </Tooltip>
        </ButtonGroup>
      </div>
    </TooltipProvider>
  )
}
