import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverHeader,
  PopoverTitle,
  PopoverDescription,
} from '@/components/ui/popover'
import { Button } from './ui/button'
import { ChevronsUpDown, Check } from 'lucide-react'

export function InputChecklist({
  subpageItem,
  inputChangeTarget,
  formData,
  setFormData,
}) {
  const currentSelection = formData[inputChangeTarget]

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-8 w-full justify-between">
          {currentSelection || 'Select team...'}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="p-1">
        <div className="max-h-60 overflow-y-auto">
          {subpageItem.map((item) => {
            const isSelected = currentSelection === item.name
            return (
              <button
                key={item.id}
                className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground transition-colors text-left"
                onClick={() => {
                  setFormData({ ...formData, [inputChangeTarget]: item.name })
                }}
              >
                <Check
                  className={`mr-2 h-4 w-4 ${isSelected ? 'opacity-100' : 'opacity-0'}`}
                />
                {item.name}
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
