import { createFileRoute } from '@tanstack/react-router'
import { FileText } from 'lucide-react'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'

export const Route = createFileRoute('/_auth/docs/')({
  component: DocsIndex,
})

function DocsIndex() {
  return (
    <div className="h-full p-4 xl:p-6 xl:pl-3">
      <Empty className="h-full border-2 border-dashed rounded-xl">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileText className="h-10 w-10 text-foreground/40" />
          </EmptyMedia>
          <EmptyTitle>No document selected</EmptyTitle>
          <EmptyDescription>
            Select a document from the list to view or edit
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  )
}
