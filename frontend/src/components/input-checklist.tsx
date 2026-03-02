import { Check, ChevronsUpDown } from 'lucide-react'
import { Button } from './ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface ChecklistItem {
  id: string | number
  name: string
}

interface InputChecklistProps<T extends ChecklistItem> {
  items: Array<T>
  value: string
  onChange: (val: string) => void
}

export function InputChecklist<T extends ChecklistItem>({
  items,
  value,
  onChange,
}: InputChecklistProps<T>) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-8 w-full justify-between">
          {value || 'Select value...'}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="p-1">
        <div className="max-h-60 overflow-y-auto">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent transition-colors text-left"
              onClick={() => onChange(item.name)}
            >
              <Check
                className={`mr-2 h-4 w-4 ${value === item.name ? 'opacity-100' : 'opacity-0'}`}
              />
              {item.name}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
