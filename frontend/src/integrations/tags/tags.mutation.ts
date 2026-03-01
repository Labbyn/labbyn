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
