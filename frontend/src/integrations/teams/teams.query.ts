import { queryOptions } from '@tanstack/react-query'
import type {
  ApiTeamInfo,
  ApiTeamInfoResponse,
  ApiTeamResponse,
} from './teams.types'
import api from '@/lib/api'

const PATHS = {
  BASE: '/db/teams',
  INFO: '/db/teams/teams_info',
  SINGLE: (id: string | number) => `/db/teams/${id}`,
  SINGLE_INFO: (id: string | number) => `/db/teams/team_info/${id}`,
  ADMIN: '/db/teams',
}

export const adminTeamsQueryOptions = queryOptions({
  queryKey: ['teams', 'admin'],
  queryFn: async () => {
    const { data } = await api.get<ApiTeamResponse>(PATHS.ADMIN)
    return data
  },
})

export const teamsQueryOptions = queryOptions({
  queryKey: ['teams'],
  queryFn: async () => {
    const { data } = await api.get<ApiTeamInfoResponse>(PATHS.BASE)
    return data
  },
})

export const teamsInfoQueryOptions = queryOptions({
  queryKey: ['teams', 'info'],
  queryFn: async () => {
    const { data } = await api.get<ApiTeamInfoResponse>(PATHS.INFO)
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

export const singleTeamInfoQueryOptions = (teamId: string | number) =>
  queryOptions({
    queryKey: ['teams', 'info', String(teamId)],
    queryFn: async () => {
      const { data } = await api.get<ApiTeamInfo>(PATHS.SINGLE_INFO(teamId))
      return data
    },
  })
