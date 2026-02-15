import { Edit2 } from 'lucide-react'
import { MarkdownRenderer } from './markdown-renderer'
import type { Document } from '@/types/types'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface DocumentPreviewProps {
  document: Document
  onEdit: () => void
}

export function DocumentPreview({ document, onEdit }: DocumentPreviewProps) {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <>
      <Card className="p-6">
        <div className="flex items-start justify-between border-b pb-4 mb-0">
          <div className="space-y-2 flex-1">
            <h1 className="text-2xl font-bold text-foreground">
              {document.title}
            </h1>
            <div className="flex gap-4 text-sm text-foreground/60">
              <span>Created by: {document.author}</span>
              <span>Updated: {formatDate(document.modified_on || document.added_on)}</span>
            </div>
          </div>
          <Button onClick={onEdit} variant="outline" size="sm">
            <Edit2 className="mr-2 h-4 w-4" />
            Edit
          </Button>
        </div>
        <div className="result">
          <MarkdownRenderer content={document.content} />
        </div>
      </Card>
    </>
  )
}
