import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import type { ApiDocumentationItem } from './documentation.types'
import api from '@/lib/api'

const PATHS = {
  BASE: '/db/documentation',
  SINGLE: (id: string | number) => `/db/documentation/${id}`,
}

const getSafeTimestamp = () => {
  const now = new Date()
  const tzOffset = now.getTimezoneOffset() * 60000
  const localTime = new Date(now.getTime() - tzOffset)
  return localTime.toISOString().split('.')[0]
}

export const useCreateDocumentMutation = () => {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: async () => {
      const timestamp = new Date().toLocaleString(undefined, { hour12: false })

      const payload = {
        title: `New Document ${timestamp}`,
        content: '# New Document',
        added_on: getSafeTimestamp(),
        modified_on: getSafeTimestamp(),
      }
      const { data } = await api.post<ApiDocumentationItem>(PATHS.BASE, payload)
      return data
    },
    onSuccess: (newDoc) => {
      toast.success('Document created')
      queryClient.invalidateQueries({ queryKey: ['documentation'] })
      navigate({
        to: '/documentation/$docId',
        params: { docId: String(newDoc.id) },
      })
    },
  })
}

export const useUpdateDocumentMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (doc: ApiDocumentationItem) => {
      const payload = {
        title: doc.title,
        content: doc.content,
        modified_on: getSafeTimestamp(),
      }
      const { data } = await api.patch<ApiDocumentationItem>(
        PATHS.SINGLE(doc.id),
        payload,
      )
      return data
    },
    onSuccess: (data) => {
      toast.success('Document saved')
      queryClient.invalidateQueries({ queryKey: ['documentation'] })
      queryClient.invalidateQueries({
        queryKey: ['documentation', String(data.id)],
      })
    },
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
      navigate({ to: '/documentation' })
    },
  })
}
