import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import api from '@/lib/api'
import type { Document } from '@/types/types'

const PATHS = {
  BASE: '/db/documentation',
  SINGLE: (id: string | number) => `/db/documentation/${id}`,
}

export const useCreateDocumentMutation = () => {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: async () => {
      const timestamp = new Date().toLocaleString()

      const { data } = await api.post<ApiDocumentationItem>(PATHS.BASE, {
        title: `New Document ${timestamp}`,
        author: 'anonymous admin',
        content: '# New Document',
      })
      return data
    },
    onSuccess: (newDoc) => {
      toast.success('Document created')
      queryClient.invalidateQueries({ queryKey: ['documentation'] })
      navigate({ to: '/docs/$docId', params: { docId: newDoc.id } })
    },
    onError: () => toast.error('Failed to create document'),
  })
}

export const useUpdateDocumentMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (doc: ApiDocumentationItem) => {
      const payload = {
        title: doc.title,
        content: doc.content
      }
      const { data } = await api.put<ApiDocumentationItem>(PATHS.SINGLE(doc.id), payload)
      return data
    },
    onSuccess: (data) => {
      toast.success('Document saved')
      queryClient.invalidateQueries({ queryKey: ['documentation'] })
      queryClient.invalidateQueries({ queryKey: ['documentation', String(data.id)] })
    },
    onError: () => toast.error('Failed to save changes'),
  })
}

export const useDeleteDocumentMutation = () => {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: async (docId: string) => {
      await api.delete(PATHS.SINGLE(docId))
    },
    onSuccess: () => {
      toast.success('Document deleted')
      queryClient.invalidateQueries({ queryKey: ['documentation'] })
      navigate({ to: '/docs' })
    },
    onError: () => toast.error('Failed to delete document'),
  })
}
