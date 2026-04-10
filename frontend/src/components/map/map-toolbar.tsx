import {
  BoxSelect,
  Hammer,
  MousePointer2,
  Move,
  Plus,
  RotateCw,
  Trash2,
  Type,
} from 'lucide-react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface MapToolbarProps {
  mode: string
  setMode: (mode: string) => void
}

export function MapToolbar({ mode, setMode }: MapToolbarProps) {
  return (
    <div className="p-1.5 backdrop-blur-md bg-card/30 rounded-xl border border-border/40 flex items-center gap-2 shadow-2xl w-fit">
      <ToggleGroup
        type="single"
        variant="outline"
        value={mode}
        onValueChange={(v) => v && setMode(v)}
      >
        <ToolbarItem
          mode={mode}
          value="view"
          icon={<MousePointer2 size={16} />}
          label="Inspect"
        />
        <ToolbarItem
          mode={mode}
          value="select"
          icon={<BoxSelect size={16} />}
          label="Marquee Select"
        />
        <ToolbarItem
          mode={mode}
          value="move"
          icon={<Move size={16} />}
          label="Move"
        />
        <ToolbarItem
          mode={mode}
          value="rotate"
          icon={<RotateCw size={16} />}
          label="Rotate"
        />
        <ToolbarItem
          mode={mode}
          value="add-rack"
          icon={<Plus size={16} />}
          label="Add Rack"
        />
        <ToolbarItem
          mode={mode}
          value="add-wall"
          icon={<Hammer size={16} />}
          label="Add Wall"
        />
        <ToolbarItem
          mode={mode}
          value="add-label"
          icon={<Type size={16} />}
          label="Add Label"
        />

        <ToolbarItem
          mode={mode}
          value="delete"
          icon={<Trash2 size={16} />}
          label="Delete"
          className="text-destructive data-[state=on]:bg-destructive data-[state=on]:text-destructive-foreground"
        />
      </ToggleGroup>
    </div>
  )
}

function ToolbarItem({
  mode,
  value,
  icon,
  label,
  className,
}: {
  mode: string
  value: string
  icon: React.ReactNode
  label: string
  className?: string
}) {
  const isActive = mode === value
  return (
    <ToggleGroupItem
      value={value}
      aria-label={label}
      className={cn(
        className,
        isActive && 'bg-accent text-accent-foreground',
        'relative w-9 h-9 p-0',
      )}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="absolute inset-0 flex items-center justify-center">
            {icon}
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={10}>
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    </ToggleGroupItem>
  )
}
