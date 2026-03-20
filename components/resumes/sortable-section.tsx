"use client"

import React from "react"
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, Trash2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

interface SortableSectionProps<T extends { _tempId: string }> {
  items: T[]
  onReorder: (items: T[]) => void
  onAdd: () => void
  onRemove: (index: number) => void
  renderItem: (
    item: T,
    index: number,
    onChange: (field: string, value: unknown) => void
  ) => React.ReactNode
  addLabel: string
}

function SortableItem<T extends { _tempId: string }>({
  item,
  index,
  onRemove,
  renderItem,
  onChange,
}: {
  item: T
  index: number
  onRemove: () => void
  renderItem: SortableSectionProps<T>["renderItem"]
  onChange: (field: string, value: unknown) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item._tempId })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-2 rounded-lg border bg-card p-3"
    >
      <button
        type="button"
        className="mt-1 cursor-grab touch-none text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <div className="flex-1">{renderItem(item, index, onChange)}</div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="mt-1 text-muted-foreground hover:text-destructive"
        onClick={onRemove}
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  )
}

export function SortableSection<T extends { _tempId: string }>({
  items,
  onReorder,
  onAdd,
  onRemove,
  renderItem,
  addLabel,
}: SortableSectionProps<T>) {
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = items.findIndex((item) => item._tempId === active.id)
    const newIndex = items.findIndex((item) => item._tempId === over.id)
    onReorder(arrayMove(items, oldIndex, newIndex))
  }

  function handleFieldChange(index: number, field: string, value: unknown) {
    const updated = items.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    )
    onReorder(updated)
  }

  return (
    <div className="space-y-3">
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={items.map((item) => item._tempId)}
          strategy={verticalListSortingStrategy}
        >
          {items.map((item, index) => (
            <SortableItem
              key={item._tempId}
              item={item}
              index={index}
              onRemove={() => onRemove(index)}
              renderItem={renderItem}
              onChange={(field, value) =>
                handleFieldChange(index, field, value)
              }
            />
          ))}
        </SortableContext>
      </DndContext>
      <Button type="button" variant="outline" onClick={onAdd} className="w-full">
        <Plus className="size-4" />
        {addLabel}
      </Button>
    </div>
  )
}
