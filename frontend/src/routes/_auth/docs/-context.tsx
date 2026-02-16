import { createContext, useContext } from 'react'
import type { ApiDocumentationItem } from '@/integrations/documentation/documentation.types'

export interface DocsContextType {
  documents: Array<ApiDocumentationItem>
  handleSave: (doc: ApiDocumentationItem) => void
  handleDelete: (id: string) => void
  isLoading: boolean
  isEditing: boolean
  setIsEditing: (value: boolean) => void
  isDirty: boolean
  setIsDirty: (value: boolean) => void
  isSaving: boolean
}

const DocsContext = createContext<DocsContextType | null>(null)

export function useDocsContext() {
  const context = useContext(DocsContext)
  if (!context) {
    throw new Error('useDocsContext must be used within a DocsLayout')
  }
  return context
}

export const DocsProvider = DocsContext.Provider
