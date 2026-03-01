import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export function SortableItem({ items, id }) {
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
          <div className="flex w-full items-center justify-between text-muted-foreground group-hover:text-primary transition-colors">
            {items.map((item) => (
              <span key={item.id} className="text-xs font-medium opacity-70">
                {item.name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
