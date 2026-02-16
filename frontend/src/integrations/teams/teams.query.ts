import { queryOptions } from '@tanstack/react-query'
import type { ApiTeamInfo, ApiTeamInfoResponse } from './teams.types'
import api from '@/lib/api'

const PATHS = {
  BASE: '/db/teams/teams_info',
  SINGLE: (id: string | number) => `/db/teams/team_info/${id}`,
}

export const teamsQueryOptions = queryOptions({
  queryKey: ['teams'],
  queryFn: async () => {
    const { data } = await api.get<ApiTeamInfoResponse>(PATHS.BASE)
    return data
  },
})

export const singleTeamQueryOptions = (teamId: string | number) =>
  queryOptions({
    queryKey: ['teams', String(teamId)],
    queryFn: async () => {
      const { data } = await api.get<ApiTeamInfo>(PATHS.SINGLE(teamId))
      return data
    },
  })
