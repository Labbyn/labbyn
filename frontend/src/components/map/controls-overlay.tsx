import { MousePointer2, RotateCcw } from 'lucide-react'

export function ControlsOverlay({ is2D }: { is2D: boolean }) {
  return (
    <div className="absolute bottom-6 left-6 z-10 pointer-events-none select-none flex flex-col gap-2">
      <div className="bg-card/95 shadow-lg border border-border text-card-foreground px-3 py-2 rounded-md text-xs font-semibold flex items-center gap-2 w-fit">
        <MousePointer2 className="w-3 h-3 text-primary" />
        <span>Select</span>
      </div>
      <div className="bg-card/95 shadow-lg border border-border text-card-foreground px-3 py-2 rounded-md text-xs font-semibold flex items-center gap-3 w-fit">
        <div className="flex gap-1 text-foreground/80">
          {['W', 'A', 'S', 'D'].map((k) => (
            <span
              key={k}
              className="bg-muted px-1.5 py-0.5 rounded border border-border/50"
            >
              {k}
            </span>
          ))}
        </div>
        <span>Move</span>
      </div>
      {!is2D && (
        <div className="bg-card/95 shadow-lg border border-border text-card-foreground px-3 py-2 rounded-md text-xs font-semibold flex items-center gap-3 w-fit">
          <RotateCcw className="w-3 h-3 text-primary" />
          <div className="flex gap-1 text-foreground/80">
            <span className="bg-muted px-1.5 py-0.5 rounded border border-border/50">
              Q
            </span>
            <span className="bg-muted px-1.5 py-0.5 rounded border border-border/50">
              E
            </span>
          </div>
          <span>Rotate</span>
        </div>
      )}
    </div>
  )
}
