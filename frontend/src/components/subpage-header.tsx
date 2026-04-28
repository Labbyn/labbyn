import { useEffect, useState } from 'react'
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
  onSave?: (e: React.MouseEvent) => void
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
  const isDeletableType = type === 'deletable'

  const [titleValue, setTitleValue] = useState(editValue)

  useEffect(() => {
    setTitleValue(editValue)
  }, [editValue])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setTitleValue(val)
    if (onEditChange) {
      onEditChange(val)
    }
  }

  return (
    <div className="flex items-center gap-4 px-6 py-4 z-10">
      <Button onClick={() => router.history.back()} variant="ghost" size="icon">
        <ArrowLeft />
      </Button>

      <div className="flex-1">
        {isEditableType && isEditing ? (
          onEditChange && <Input value={titleValue} onChange={handleChange} />
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
              <Button onClick={onSave} type="button" variant="default">
                <Check /> Save
              </Button>
            </ButtonGroup>
          )}
        </div>
      )}
      {isDeletableType && (
        <div className="flex gap-2 items-center">
          {title === 'virtual' ? (
            <span className="text-sm text-muted-foreground">
              Cannot delete virtual lab
            </span>
          ) : (
            onDelete && <DeleteAlertDialog onDelete={onDelete} />
          )}
        </div>
      )}
    </div>
  )
}
