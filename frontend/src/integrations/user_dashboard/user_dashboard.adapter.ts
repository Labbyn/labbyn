import type { ApiDashboardResponse } from './user_dashboard.types'

export function fetchDashboardData(apiData: ApiDashboardResponse) {
  return apiData.sections.map((section) => ({
    name: section.name,
    pages: section.items.map((item) => ({
      type: item.type,
      description: {
        id: item.id,
        location: item.location,
        tags: item.tags,
      },
    })),
  }))
}
