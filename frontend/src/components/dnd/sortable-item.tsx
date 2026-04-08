import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SortableItemData {
  id: string | number
  name: string
}

interface sortableItemProps<T> {
  items: Array<T>
  id: string | number
  shelfName: string
  onDelete: (id: number) => void
}

export function SortableItem<T extends SortableItemData>({
  items,
  id,
  shelfName,
  onDelete,
}: sortableItemProps<T>) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  // Display all machines on shelf in one row
  return (
    <div
      className=""
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
    >
      <div className="flex flex-col space-y-3 w-full px-4 py-2">
        <div className="group relative flex flex-row items-center justify-between w-full h-12 p-3 rounded-lg border bg-muted/30 hover:bg-primary/5 hover:border-primary/50 transition-all cursor-pointer">
          <div className="font-bold text-sm min-w-20 text-foreground">
            {shelfName}
          </div>
          <div className="w-px h-8 bg-border/50 shrink-0" />
          <div className="flex w-full items-center">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center ml-2 bg-card text-card-foreground border rounded-sm px-3 py-1.5 min-w-[120px]"
              >
                <span className="text-sm font-semibold truncate">
                  {item.name}
                </span>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onPointerDown={(e) => e.stopPropagation()}
            className="shrink-0 text-muted-foreground hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(Number(id))
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
