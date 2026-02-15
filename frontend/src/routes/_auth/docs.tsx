import { Outlet, createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { DocsProvider } from './docs/-context'
import type { Document } from '@/types/types'
import { DocumentList } from '@/components/document-list'
import { ScrollArea } from '@/components/ui/scroll-area'
import { PageIsLoading } from '@/components/page-is-loading'
import { documentationQueryOptions } from '@/integrations/documentation/documentation.query'
import { useCreateDocumentMutation, useDeleteDocumentMutation, useUpdateDocumentMutation } from '@/integrations/documentation/documentation.mutations'
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


export const Route = createFileRoute('/_auth/docs')({
  component: DocsLayout,
})

function DocsLayout() {
  const navigate = Route.useNavigate()
  const queryClient = useQueryClient()

  const [isEditing, setIsEditing] = useState(false)
  const [showCreateAlert, setShowCreateAlert] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  const { data: documents = [], isLoading } = useQuery(documentationQueryOptions)

  const createMutation = useCreateDocumentMutation()
  const updateMutation = useUpdateDocumentMutation()
  const deleteMutation = useDeleteDocumentMutation()

  const handleSave = (doc: Document) => updateMutation.mutate(doc)
  const handleDelete = (docId: string) => deleteMutation.mutate(docId)

  const handleCreate = () => {
    if (isDirty) {
      setShowCreateAlert(true)
      return
    }
    setIsEditing(false)
    createMutation.mutate()
  }

  const handleForceCreate = () => {
    setIsEditing(false)
    setIsDirty(false)
    setShowCreateAlert(false)
    createMutation.mutate()
  }

  if (isLoading) return <PageIsLoading />

  return (
    <>
      <div className="h-auto xl:h-screen w-full xl:overflow-hidden">
        <div className="grid grid-cols-1 xl:grid-cols-5 h-full">
          <div className="xl:col-span-2 h-full xl:overflow-y-hidden">
            <ScrollArea className="h-full" dir="rtl">
              <div className="p-4 pb-0 xl:p-6 xl:pb-6 xl:pr-3" dir="ltr">
                <DocumentList
                  documents={documents}
                  selectedDoc={null}
                  onSelectDocument={(doc) =>
                    navigate({ to: '/docs/$docId', params: { docId: doc.id } })
                  }
                  onCreateDocument={handleCreate}
                  onDeleteDocument={handleDelete}
                />
              </div>
            </ScrollArea>
          </div>
          <div className="xl:col-span-3 w-full h-full xl:overflow-hidden">
            <DocsProvider
              value={{
                documents,
                handleSave,
                handleDelete,
                isEditing,
                setIsEditing,
                isLoading,
                isDirty,
                setIsDirty,
              }}
            >
              <Outlet />
            </DocsProvider>
          </div>
        </div>
      </div>
      <AlertDialog open={showCreateAlert} onOpenChange={setShowCreateAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes in the current document. Creating a new
              document will discard them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleForceCreate}
              className="bg-destructive hover:bg-destructive/90"
            >
              Discard & Create
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
