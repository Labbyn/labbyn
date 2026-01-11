export type ApiDashboardResponse = {
  sections: Array<{
    name: string
    items: Array<{
      type: string
      id: string
      location: string
      tags: Array<string>
    }>
  }>
}
