import { useState, useEffect } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { SortableItem } from './sortable-item'
import type { DragEndEvent } from '@dnd-kit/core'
import type { ApiShelfItem } from '@/integrations/shelves/shelves.types'

interface DndTableProps {
  shelves: Array<ApiShelfItem>
  onReorder: (newShelves: Array<any>) => void
  onDelete: (id: number) => void
}

export function DndTable({
  shelves: initialShelves,
  onReorder,
  onDelete
}: DndTableProps) {
  const [shelves, setShelves] = useState(initialShelves)
  useEffect(() => {
    setShelves(initialShelves || [])
  }, [initialShelves])
  console.log(shelves);
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={shelves.map((shelf) => shelf.id)}
        strategy={verticalListSortingStrategy}
      >
        {shelves.map((shelf) => (
          <SortableItem items={shelf.machines} shelfName={shelf.name} id={shelf.id} key={shelf.id} onDelete={onDelete}/>
        ))}
      </SortableContext>
    </DndContext>
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    // we have a 2D array of machines representing shelfs
    if (!over || active.id === over.id) {
      return
    }
    const oldIndex = shelves.findIndex((shelf) => shelf.id === active.id)
    const newIndex = shelves.findIndex((shelf) => shelf.id === over.id)

    const reorderedShelves = arrayMove(shelves, oldIndex, newIndex)
    const updatedShelves = reorderedShelves.map((shelf, index) => ({
      ...shelf,
      order: index + 1,
    }))
    setShelves(updatedShelves)
    onReorder(updatedShelves)
  }
}
