import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import api from '@/lib/api'

const PATHS = {
  BASE: '/db/tags',
  DETAIL: (id: number) => `/db/tags/${id}`,
}

export async function useCreateTagMutation(tagData: {
  name: string
  color: string
}) {
  const { data } = await api.post(PATHS.BASE, tagData)
  return data
}
