import { ArrowLeft, Check, Edit2, X } from 'lucide-react'
import { Separator } from './ui/separator'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function SubpageHeader({
  title,
  isEditing,
  editValue,
  onEditChange,
  onSave,
  onCancel,
  onStartEdit,
}) {
  return (
    <div className="flex items-center gap-4 bg-background/95 px-6 py-4 backdrop-blur z-10">
      <Button onClick={() => router.history.back()} variant="ghost" size="icon">
        <ArrowLeft className="h-5 w-5" />
      </Button>

      <div className="flex-1">
        {isEditing ? (
          <Input
            value={editValue}
            onChange={(e) => onEditChange(e.target.value)}
            className="h-8"
          />
        ) : (
          <h1 className="text-xl font-bold tracking-tight">{title}</h1>
        )}
      </div>

      <div className="flex gap-2">
        {!isEditing ? (
          <Button onClick={onStartEdit} variant="outline" size="sm">
            <Edit2 className="mr-2 h-4 w-4" /> Edit
          </Button>
        ) : (
          <>
            <Button onClick={onCancel} variant="ghost" size="sm">
              <X className="mr-2 h-4 w-4" /> Cancel
            </Button>
            <Button onClick={onSave} variant="default" size="sm">
              <Check className="mr-2 h-4 w-4" /> Save
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
