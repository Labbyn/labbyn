import { Outlet, createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { DocsProvider } from './docs/-context'
import type { Document } from '@/types/types'
import { DocumentList } from '@/components/document-list'
import { ScrollArea } from '@/components/ui/scroll-area'
import { PageIsLoading } from '@/components/page-is-loading'
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
import { documents as mockDocuments } from '@/lib/mock-data'

export const Route = createFileRoute('/_auth/docs')({
  component: DocsLayout,
})

const fetchDocuments = async (): Promise<Array<Document>> => {
  await new Promise((resolve) => setTimeout(resolve, 500))
  const stored = localStorage.getItem('documents')
  if (stored) {
    return JSON.parse(stored).map((d: any) => ({
      ...d,
      createdAt: new Date(d.createdAt),
      updatedAt: new Date(d.updatedAt),
    }))
  }
  return mockDocuments
}

function DocsLayout() {
  const navigate = Route.useNavigate()
  const queryClient = useQueryClient()

  const [isEditing, setIsEditing] = useState(false)
  const [showCreateAlert, setShowCreateAlert] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: fetchDocuments,
  })

  const saveMutation = useMutation({
    mutationFn: async (updatedDoc: Document) => {
      const updated = documents.map((doc) =>
        doc.id === updatedDoc.id
          ? { ...updatedDoc, updatedAt: new Date() }
          : doc,
      )
      localStorage.setItem('documents', JSON.stringify(updated))
      return updated
    },
    onSuccess: (updatedDocs) => {
      queryClient.setQueryData(['documents'], updatedDocs)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (docId: string) => {
      const filtered = documents.filter((doc) => doc.id !== docId)
      localStorage.setItem('documents', JSON.stringify(filtered))
      return filtered
    },
    onSuccess: (filteredDocs) => {
      queryClient.setQueryData(['documents'], filteredDocs)
      navigate({ to: '/docs' })
    },
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      const newId = Date.now().toString()
      const newDoc: Document = {
        id: newId,
        name: 'New Document',
        content: '',
        createdBy: 'User',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      const updated = [newDoc, ...documents]
      localStorage.setItem('documents', JSON.stringify(updated))
      return { updated, newId }
    },
    onSuccess: ({ updated, newId }) => {
      queryClient.setQueryData(['documents'], updated)
      navigate({ to: '/docs/$docId', params: { docId: newId } })
    },
  })

  const handleSave = (doc: Document) => saveMutation.mutate(doc)
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
          <div className="xl:col-span-2 h-full xl:overflow-y-hidden border-r">
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
