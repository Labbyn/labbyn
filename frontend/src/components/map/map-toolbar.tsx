import { Hammer, MousePointer2, Move, Plus, Trash2, Type } from 'lucide-react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface MapToolbarProps {
  mode: string
  setMode: (mode: any) => void
}

export function MapToolbar({ mode, setMode }: MapToolbarProps) {
  return (
    <TooltipProvider delayDuration={0}>
      <div className="p-1.5 backdrop-blur-md bg-card/30 rounded-xl border border-border/40 items-center gap-2 shadow-2xl w-fit">
        <ToggleGroup
          type="single"
          variant="outline"
          value={mode}
          onValueChange={(v) => v && setMode(v)}
        >
          <ToolbarItem
            value="view"
            icon={<MousePointer2 size={16} />}
            label="Inspect"
          />
          <ToolbarItem value="move" icon={<Move size={16} />} label="Move" />

          <ToolbarItem
            value="add-rack"
            icon={<Plus size={16} />}
            label="Add Rack"
          />
          <ToolbarItem
            value="add-wall"
            icon={<Hammer size={16} />}
            label="Add Wall"
          />
          <ToolbarItem
            value="add-label"
            icon={<Type size={16} />}
            label="Add Label"
          />

          <ToolbarItem
            value="delete"
            icon={<Trash2 size={16} />}
            label="Delete"
            className="text-destructive data-[state=on]:bg-destructive data-[state=on]:text-destructive-foreground"
          />
        </ToggleGroup>
      </div>
    </TooltipProvider>
  )
}

function ToolbarItem({
  value,
  icon,
  label,
  className,
}: {
  value: string
  icon: React.ReactNode
  label: string
  className?: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <ToggleGroupItem value={value} aria-label={label} className={className}>
          {icon}
        </ToggleGroupItem>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  )
}
