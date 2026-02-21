import { Expand, MousePointer2, RotateCcw } from 'lucide-react'
import { Kbd } from '../ui/kbd'

export function ControlsOverlay({ is2D }: { is2D: boolean }) {
  return (
    <div className="absolute bottom-6 left-6 z-10 pointer-events-none select-none flex flex-col gap-2">
      <ControlHint
        icon={<MousePointer2 className="w-3 h-3" />}
        text="Select / Inspect"
      />
      {!is2D && (
        <ControlHint
          icon={<RotateCcw className="w-3 h-3" />}
          keys={['Q', 'E']}
          text="Orbit"
        />
      )}
      <ControlHint
        icon={<Expand className="w-3 h-3" />}
        keys={['W', 'A', 'S', 'D']}
        text="Pan View"
      />
    </div>
  )
}

function ControlHint({
  icon,
  keys,
  text,
}: {
  icon?: React.ReactNode
  keys?: Array<string>
  text: string
}) {
  return (
    <div className="backdrop-blur-md bg-card/30 rounded-xl border border-border/40 text-card-foreground px-3 py-2 text-[10px] font-bold uppercase tracking-tight flex items-center gap-3 w-fit">
      {icon}
      {keys && (
        <div className="flex gap-1">
          {keys.map((k) => (
            <Kbd key={k}>{k}</Kbd>
          ))}
        </div>
      )}
      <span className="opacity-70">{text}</span>
    </div>
  )
}
