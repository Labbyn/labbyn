import React, { useState } from 'react'
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

export function DndTable({ dbItems }) {
  const [items, setItems] = useState(dbItems)
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
        items={items.map((shelf) => shelf[0].id)}
        strategy={verticalListSortingStrategy}
      >
        {items.map((shelf) => (
          <SortableItem items={shelf} id={shelf[0].id} key={shelf[0].id} />
        ))}
      </SortableContext>
    </DndContext>
  )

  function handleDragEnd(event) {
    const { active, over } = event
    // we have a 2D array of machines representing shelfs
    if (active.id !== over.id) {
      setItems((shelf) => {
        const oldIndex = shelf.findIndex((item) => item[0].id === active.id)
        const newIndex = shelf.findIndex((item) => item[0].id === over.id)

        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }
}
