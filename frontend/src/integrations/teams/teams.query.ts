import { queryOptions } from '@tanstack/react-query'
import type { ApiTeamResponse } from './teams.types'
import api from '@/lib/api'

const PATHS = {
  BASE: '/db/teams',
}

export const teamsQueryOptions = queryOptions({
  queryKey: ['teams'],
  queryFn: async () => {
    const { data } = await api.get<ApiTeamResponse>(PATHS.BASE)
    return data
  },
})
