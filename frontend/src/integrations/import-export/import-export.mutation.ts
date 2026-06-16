import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { ApiImportPayload, ImportEntityType } from './import-export.types'
import api from '@/lib/api'

const PATHS = {
  IMPORT: (entityType: ImportEntityType | string) => `/db/import/${entityType}`,
  EXPORT: (entityType: string, format: string) =>
    `/db/export/${entityType}?format=${format}`,
  EXPORT_BULK: '/db/export/all/bulk',
}

export const useImportDataMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      entityType,
      payload,
    }: {
      entityType: ImportEntityType | string
      payload: ApiImportPayload
    }) => {
      const { data } = await api.post<string>(PATHS.IMPORT(entityType), payload)
      return data
    },
    onSuccess: (data, variables) => {
      toast.success(typeof data === 'string' ? data : 'Import successful!')
      queryClient.invalidateQueries({ queryKey: [variables.entityType] })
    },
    onError: (error: any) => {
      const detail = error.response?.data?.detail
      if (detail) {
        const msg = Array.isArray(detail)
          ? detail
              .map((e: any) => `${e.loc?.join('.') || 'Error'}: ${e.msg}`)
              .join(', ')
          : detail
        toast.error(`Import failed: ${msg}`)
      } else {
        toast.error(error.message || 'Failed to import data')
      }
    },
  })
}

export const useExportDataMutation = () => {
  return useMutation({
    mutationFn: async ({
      entityType,
      format,
    }: {
      entityType: string
      format: 'json' | 'csv'
    }) => {
      const response = await api.get(PATHS.EXPORT(entityType, format), {
        responseType: 'blob',
      })
      return { data: response.data, format, entityType }
    },
    onSuccess: ({ data, format, entityType }) => {
      const url = window.URL.createObjectURL(new Blob([data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${entityType}_export.${format}`)
      document.body.appendChild(link)
      link.click()
      link.parentNode?.removeChild(link)
      toast.success(`${entityType} exported successfully`)
    },
    onError: (error: any) => {
      toast.error('Export failed', {
        description:
          error.response?.status === 500
            ? 'Internal Server Error'
            : error.message,
      })
    },
  })
}

export const useExportBulkMutation = () => {
  return useMutation({
    mutationFn: async () => {
      const response = await api.get(PATHS.EXPORT_BULK, {
        responseType: 'blob',
      })
      return response.data
    },
    onSuccess: (data) => {
      const url = window.URL.createObjectURL(new Blob([data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `bulk_export.json`)
      document.body.appendChild(link)
      link.click()
      link.parentNode?.removeChild(link)
      toast.success('Bulk data exported successfully')
    },
    onError: (error: any) => {
      toast.error('Bulk export failed', {
        description: error.message,
      })
    },
  })
}
