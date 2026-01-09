import { createFileRoute, useBlocker } from '@tanstack/react-router'
import { useEffect, useMemo } from 'react'
import { useDocsContext } from './-context'
import type { Document as AppDocument } from '@/types/types'
import { DocumentEditor } from '@/components/document-editor'
import { DocumentPreview } from '@/components/document-preview'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export const Route = createFileRoute('/_auth/docs/$docId')({
  component: DocDetailComponent,
})

function DocDetailComponent() {
  const { docId } = Route.useParams()
  const {
    documents,
    handleSave,
    isEditing,
    setIsEditing,
    isDirty,
    setIsDirty,
  } = useDocsContext()

  console.log('Szukane ID:', docId)
  console.log('Dostępne dokumenty:', documents)

  const selectedDoc = useMemo(
    () => documents.find((d: AppDocument) => d.id === docId),
    [documents, docId],
  )

  useEffect(() => {
    setIsEditing(false)
    setIsDirty(false)
  }, [docId, setIsEditing, setIsDirty])

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault()
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  const blocker = useBlocker({
    shouldBlockFn: () => isDirty,
    withResolver: true,
    enableBeforeUnload: false,
  })

  if (!selectedDoc) {
    return (
      <div className="p-10 text-center text-muted-foreground">
        Document not found
      </div>
    )
  }

  return (
    <>
      <ScrollArea className="h-full">
        <div className="p-4 xl:p-6 xl:pl-3">
          {isEditing ? (
            <DocumentEditor
              key={selectedDoc.id}
              document={selectedDoc}
              onDirtyChange={setIsDirty}
              onSave={(doc) => {
                handleSave(doc)
                setIsEditing(false)
                setIsDirty(false)
              }}
              onCancel={() => {
                setIsEditing(false)
                setIsDirty(false)
              }}
            />
          ) : (
            <DocumentPreview
              document={selectedDoc}
              onEdit={() => setIsEditing(true)}
            />
          )}
        </div>
      </ScrollArea>
      <AlertDialog open={blocker.status === 'blocked'}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes in <strong>{selectedDoc.name}</strong>.
              Are you sure you want to leave? Your changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => blocker.reset?.()}>
              Keep Editing
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setIsEditing(false)
                setIsDirty(false)
                setTimeout(() => blocker.proceed?.(), 0)
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
