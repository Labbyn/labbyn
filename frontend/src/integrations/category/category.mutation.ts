import api from '@/lib/api'

const PATHS = {
  BASE: '/db/categories',
  DETAIL: (id: number) => `/db/categories/${id}`,
}

export async function useCreateCategoryMutation(categoryData: {
  name: string
}) {
  const { data } = await api.post(PATHS.BASE, categoryData)
  return data
}
