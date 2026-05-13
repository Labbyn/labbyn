import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import {
  MultiSelect,
  MultiSelectContent,
  MultiSelectGroup,
  MultiSelectItem,
  MultiSelectTrigger,
  MultiSelectValue,
} from './ui/multi-select'
import { Input } from './ui/input'
import { Button } from './ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import { Field, FieldLabel } from './ui/field'

export interface FieldConfig {
  type: 'text' | 'number' | 'select' | 'password' | 'email' | 'multi-select'
  options?: Array<{ label: string; value: string }>
}

interface GenericCreateDialogProps<T> {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: T) => void
  title: string
  defaultValues: T // Used to "discover" the fields
  fieldsConfig?: Partial<Record<keyof T, FieldConfig>>
}

export function GenericCreateDialog<T extends Record<string, any>>({
  isOpen,
  onClose,
  onSubmit,
  title,
  defaultValues,
  fieldsConfig,
}: GenericCreateDialogProps<T>) {
  const [formData, setFormData] = useState<T>(defaultValues)

  useEffect(() => {
    if (isOpen) {
      setFormData(defaultValues)
    }
  }, [isOpen, defaultValues])

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
            const rawString = String(key).replace(/_/g, ' ')
            const label =
              rawString.charAt(0).toUpperCase() +
              rawString.slice(1).toLowerCase()
            const config = fieldsConfig?.[key]

            return (
              <Field
                key={String(key)}
                className="grid grid-cols-4 items-center gap-4"
              >
                <FieldLabel
                  htmlFor={String(key)}
                  className="text-right text-xs"
                >
                  {label}
                </FieldLabel>

                {config?.type === 'select' ? (
                  <div className="col-span-3 min-w-0">
                    <Select
                      value={String(formData[key] ?? '')}
                      onValueChange={(value) => handleChange(key, value)}
                    >
                      <SelectTrigger id={String(key)} className="w-full">
                        <SelectValue
                          placeholder={`Select ${label.toLowerCase()}`}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {config.options?.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : config?.type === 'multi-select' ? (
                  <div className="col-span-3 min-w-0">
                    <MultiSelect
                      values={
                        Array.isArray(formData[key])
                          ? (formData[key] as any).map(String)
                          : []
                      }
                      onValuesChange={(newValues) =>
                        handleChange(key, newValues.map(Number))
                      }
                    >
                      <MultiSelectTrigger className="w-full bg-background">
                        <MultiSelectValue
                          placeholder={`Select ${label.toLowerCase()}`}
                          className="min-w-0 flex-1"
                        />
                      </MultiSelectTrigger>
                      <MultiSelectContent>
                        <MultiSelectGroup>
                          {config.options?.map((opt) => (
                            <MultiSelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </MultiSelectItem>
                          ))}
                        </MultiSelectGroup>
                      </MultiSelectContent>
                    </MultiSelect>
                  </div>
                ) : (
                  <div className="col-span-3 min-w-0">
                    <Input
                      id={String(key)}
                      className="w-full"
                      type={
                        config?.type ||
                        (typeof val === 'number' ? 'number' : 'text')
                      }
                      value={formData[key] ?? ''}
                      onChange={(e) =>
                        handleChange(
                          key,
                          typeof val === 'number' || config?.type === 'number'
                            ? Number(e.target.value)
                            : e.target.value,
                        )
                      }
                    />
                  </div>
                )}
              </Field>
            )
          })}
        </div>
        <DialogFooter>
          <Button onClick={() => onSubmit(formData)}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
