import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import type { Document } from '@/types/types'

interface DocumentEditorProps {
  document: Document
  onSave: (doc: Document) => void
  onCancel: () => void
}

export function DocumentEditor({
  document,
  onSave,
  onCancel,
}: DocumentEditorProps) {
  const [name, setName] = useState(document.name)
  const [content, setContent] = useState(document.content)

  const handleSave = () => {
    onSave({
      ...document,
      name: name || 'Untitled',
      content,
    })
  }

  return (
    <Card className="p-6 space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Document Title</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter document title"
          className="h-9"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Markdown Content</label>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Enter markdown content..."
          className="min-h-95 font-mono text-sm"
        />
      </div>

      <div className="flex gap-2 pt-4">
        <Button onClick={handleSave} variant="default">
          Save Document
        </Button>
        <Button onClick={onCancel} variant="outline">
          Cancel
        </Button>
      </div>
    </Card>
  )
}
