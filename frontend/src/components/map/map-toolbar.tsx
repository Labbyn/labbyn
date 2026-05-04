// components/map-toolbar.tsx
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
    <div className="backdrop-blur-xl bg-card/60 rounded-2xl border border-border/50 shadow-2xl p-1.5 flex items-center">
      <ToggleGroup
        type="single"
        orientation="horizontal"
        value={mode}
        onValueChange={(v) => v && setMode(v)}
        className="gap-1"
      >
        <ToolbarItem
          mode={mode}
          value="view"
          icon={<MousePointer2 size={18} />}
          label="Inspect"
        />
        <ToolbarItem
          mode={mode}
          value="select"
          icon={<BoxSelect size={18} />}
          label="Marquee Select"
        />
        <div className="w-px h-6 bg-border/50 mx-1" /> {/* Divider */}
        <ToolbarItem
          mode={mode}
          value="move"
          icon={<Move size={18} />}
          label="Move"
        />
        <ToolbarItem
          mode={mode}
          value="rotate"
          icon={<RotateCw size={18} />}
          label="Rotate"
        />
        <div className="w-px h-6 bg-border/50 mx-1" /> {/* Divider */}
        <ToolbarItem
          mode={mode}
          value="add-rack"
          icon={<Plus size={18} />}
          label="Add Rack"
        />
        <ToolbarItem
          mode={mode}
          value="add-wall"
          icon={<Hammer size={18} />}
          label="Add Wall"
        />
        <ToolbarItem
          mode={mode}
          value="add-label"
          icon={<Type size={18} />}
          label="Add Label"
        />
        <div className="w-px h-6 bg-border/50 mx-1" /> {/* Divider */}
        <ToolbarItem
          mode={mode}
          value="delete"
          icon={<Trash2 size={18} />}
          label="Delete"
          className="text-destructive hover:text-destructive data-[state=on]:bg-destructive data-[state=on]:text-destructive-foreground"
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
        isActive && 'bg-primary/20 text-primary shadow-sm',
        'relative w-10 h-10 rounded-full transition-all duration-200 hover:bg-muted/50',
      )}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="absolute inset-0 flex items-center justify-center">
            {icon}
          </span>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          sideOffset={12}
          className="text-xs font-semibold"
        >
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    </ToggleGroupItem>
  )
}
