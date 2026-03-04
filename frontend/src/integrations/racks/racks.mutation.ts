import api from '@/lib/api'

const PATHS = {
  BASE: '/db/racks',
  DETAIL: (id: number) => `/db/racks/${id}`,
}

export async function useCreateRackMutation(rackData: {
  name: string
  room_id: number
  team_id: number
  tag_ids?: Array<string>
}) {
  const { data } = await api.post(PATHS.BASE, rackData)
  return data
}
