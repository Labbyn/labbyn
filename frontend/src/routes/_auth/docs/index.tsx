import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/docs/')({
  component: DocsIndex,
})

function DocsIndex() {
  return (
    <div className="h-full p-4 xl:p-6 xl:pl-3">
      <div className="h-full flex flex-col p-6 items-center justify-center text-center rounded-xl border-2 border-dashed border-border">
        <div>
          <p className="text-foreground/60 font-medium">No document selected</p>
          <p className="text-sm text-foreground/40 mt-1">
            Select a document from the list to view or edit
          </p>
        </div>
      </div>
    </div>
  )
}
