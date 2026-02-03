import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Label } from './ui/label'
import { Input } from './ui/input'
import { Button } from './ui/button'

interface GenericCreateDialogProps<T> {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: T) => void
  title: string
  defaultValues: T // Used to "discover" the fields
}

export function GenericCreateDialog<T extends Record<string, any>>({
  isOpen,
  onClose,
  onSubmit,
  title,
  defaultValues,
}: GenericCreateDialogProps<T>) {
  const [formData, setFormData] = useState<T>(defaultValues)

  const handleChange = (key: keyof T, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  const fields = Object.keys(defaultValues) as Array<keyof T>

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {fields.map((key) => {
            const val = defaultValues[key]
            const label = String(key).replace(/_/g, ' ').toUpperCase()

            return (
              <div
                key={String(key)}
                className="grid grid-cols-4 items-center gap-4"
              >
                <Label htmlFor={String(key)} className="text-right text-xs">
                  {label}
                </Label>
                <Input
                  id={String(key)}
                  className="col-span-3"
                  type={typeof val === 'number' ? 'number' : 'text'}
                  value={formData[key] ?? ''}
                  onChange={(e) =>
                    handleChange(
                      key,
                      typeof val === 'number'
                        ? Number(e.target.value)
                        : e.target.value,
                    )
                  }
                />
              </div>
            )
          })}
        </div>
        <DialogFooter>
          <Button onClick={() => onSubmit(formData)}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
