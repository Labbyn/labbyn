'use client'

import { useCallback, useState } from 'react'
import { FileText, FileUp, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface FileUploadProps {
  onFileLoaded: (content: string, fileName: string) => void
  fileName: string | null
  onClear: () => void
}

export function FileUpload({
  onFileLoaded,
  fileName,
  onClear,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)

  const handleFile = useCallback(
    (file: File) => {
      if (!file.name.endsWith('.csv')) return
      const reader = new FileReader()
      reader.onload = (e) => onFileLoaded(e.target?.result as string, file.name)
      reader.readAsText(file)
    },
    [onFileLoaded],
  )

  if (fileName) {
    return (
      <div className="flex items-center justify-between gap-4 p-3 rounded-lg border bg-primary/5 border-primary/20 min-w-0 w-full">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 bg-primary rounded-md text-primary-foreground shrink-0">
            <FileText className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium leading-none truncate">
              {fileName}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-tighter">
              Ready to Map
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClear}
          className="shrink-0 h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div
      onDrop={(e) => {
        e.preventDefault()
        setIsDragging(false)
        handleFile(e.dataTransfer.files[0])
      }}
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      className={cn(
        'group relative rounded-xl border-2 border-dashed transition-all duration-200',
        isDragging
          ? 'border-primary bg-primary/5 scale-[1.01]'
          : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50',
      )}
    >
      <label className="flex cursor-pointer flex-col items-center justify-center gap-4 px-6 py-12">
        <div
          className={cn(
            'p-4 rounded-full bg-muted transition-colors duration-200',
            isDragging
              ? 'bg-primary text-primary-foreground'
              : 'group-hover:bg-primary/10 group-hover:text-primary',
          )}
        >
          <FileUp className="h-8 w-8" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold">
            Click to upload or drag and drop
          </p>
          <p className="text-xs text-muted-foreground mt-1">CSV files only</p>
        </div>
        <input
          type="file"
          accept=".csv"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          className="sr-only"
        />
      </label>
    </div>
  )
}
