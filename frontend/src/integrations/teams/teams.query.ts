import { queryOptions } from '@tanstack/react-query'
import { fetchTeamData } from './teams.adapter'
import type { ApiTeamResponse } from './teams.types'

const TEAM_ENDPOINT = `http://${import.meta.env.VITE_API_URL}/db/teams/`

export const teamQueryOptions = queryOptions({
  queryKey: ['team'],
  queryFn: async () => {
    const res = await fetch(TEAM_ENDPOINT)
    if (!res.ok) throw new Error('Failed to fetch teams')

    const data: ApiTeamResponse = await res.json()
    return fetchTeamData(data)
  },
})
