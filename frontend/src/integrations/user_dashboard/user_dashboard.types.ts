export type ApiDashboardResponse = {
  sections: {
    name: string
    items: {
      type: string
      id: string
      location: string
      tags: string[]
    }[]
  }[]
}
