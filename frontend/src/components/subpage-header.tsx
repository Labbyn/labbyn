import { ArrowLeft, Check, Edit2, X } from 'lucide-react'
import { useRouter } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ButtonGroup } from '@/components/ui/button-group'
import { DeleteAlertDialog } from '@/components/delete-alert-dialog'

export interface SubpageHeaderProps {
  title: string
  isEditing?: boolean
  editValue?: string
  onEditChange?: (val: string) => void
  onSave?: () => void
  onCancel?: () => void
  onStartEdit?: () => void
  onDelete?: () => void
  type?: string
}

export function SubpageHeader({
  title,
  isEditing = false,
  type = 'default',
  onEditChange,
  onSave,
  onCancel,
  onStartEdit,
  onDelete,
  editValue,
}: SubpageHeaderProps) {
  const router = useRouter()

  const isEditableType = type === 'editable'

  return (
    <div className="flex items-center gap-4 px-6 py-4 z-10">
      <Button onClick={() => router.history.back()} variant="ghost" size="icon">
        <ArrowLeft />
      </Button>

      <div className="flex-1">
        {isEditableType && isEditing ? (
          onEditChange && (
            <Input
              value={editValue}
              onChange={(e) => onEditChange(e.target.value)}
            />
          )
        ) : (
          <h1 className="text-xl font-bold tracking-tight">{title}</h1>
        )}
      </div>

      {isEditableType && (
        <div className="flex gap-2">
          {!isEditing ? (
            <>
              <Button onClick={onStartEdit} variant="secondary">
                <Edit2 /> Edit
              </Button>
              {onDelete && <DeleteAlertDialog onDelete={onDelete} />}
            </>
          ) : (
            <ButtonGroup>
              <Button onClick={onCancel} variant="secondary">
                <X /> Cancel
              </Button>
              <Button onClick={onSave} variant="default">
                <Check /> Save
              </Button>
            </ButtonGroup>
          )}
        </div>
      )}
    </div>
  )
}
