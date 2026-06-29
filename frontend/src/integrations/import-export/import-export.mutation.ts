import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type {
  ApiImportPayload,
  ImportEntityType,
  ImportReportResponse,
} from './import-export.types'
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
      const response = await api.post<ImportReportResponse | string>(
        PATHS.IMPORT(entityType),
        payload,
        {
          validateStatus: (status) =>
            (status >= 200 && status < 300) || status === 400,
        },
      )

      if (response.status === 400) {
        const validationError = new Error('Import Validation Failed')
        ;(validationError as any).response = response
        throw validationError
      }

      return response.data
    },

    throwOnError: false,

    onSuccess: (data, variables) => {
      if (typeof data !== 'string') {
        if (data.summary.failed > 0) {
          toast.warning(
            `Import completed with ${data.summary.failed} errors. See report for details.`,
          )
        } else {
          toast.success(
            `Successfully imported ${data.summary.success} records!`,
          )
        }
      } else {
        toast.success(typeof data === 'string' ? data : 'Import successful!')
      }
      queryClient.invalidateQueries({ queryKey: [variables.entityType] })
    },

    onError: (error: any) => {
      const errorData = error.response?.data
      const reportPayload = errorData?.summary
        ? errorData
        : errorData?.detail?.summary
          ? errorData.detail
          : null

      if (reportPayload && reportPayload.summary) {
        toast.error(
          `Import failed: 0 records imported. See report for details.`,
        )
        return
      }

      const detail = errorData?.detail
      if (detail) {
        const msg = Array.isArray(detail)
          ? detail
              .map((e: any) => `${e.loc?.join('.') || 'Error'}: ${e.msg}`)
              .join(', ')
          : typeof detail === 'string'
            ? detail
            : JSON.stringify(detail)

        toast.error(`Import failed: ${msg}`)
      } else {
        const fallbackMsg =
          errorData?.message || error.message || 'Failed to import data'
        toast.error(
          typeof fallbackMsg === 'string'
            ? fallbackMsg
            : JSON.stringify(fallbackMsg),
        )
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
