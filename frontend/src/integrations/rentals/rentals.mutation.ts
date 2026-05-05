const PATHS = {
  BASE: '/db/rental/',
  DETAIL: (id: string | number) => `/db/rental/${id}`,
}

export async function useCreateRentalMutation(rentData: {
  item_id: number
  quantity: number
  start_date: string
  end_date: string
  team_id: number
}) {
  const { data } = await api.post(PATHS.BASE, rentData)
  return data
}
