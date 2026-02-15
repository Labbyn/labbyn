import { queryOptions } from '@tanstack/react-query'
import type { ApiDocumentationItem, ApiDocumentationResponse } from './documentation.types'
import api from '@/lib/api'

const PATHS = {
  BASE: '/db/documentation',
  SINGLE: (id: string | number) => `/db/documentation/${id}`,
}

export const documentationQueryOptions = queryOptions({
  queryKey: ['documentation'],
  queryFn: async () => {
    const { data } = await api.get<ApiDocumentationResponse>(PATHS.BASE)
    return data
  },
})

export const singleDocumentQueryOptions = (docId: string | number) =>
  queryOptions({
    queryKey: ['documentation', String(docId)],
    queryFn: async () => {
      const { data } = await api.get<ApiDocumentationItem>(PATHS.SINGLE(docId))
      return data
    },
  })
