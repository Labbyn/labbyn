export type ApiLabsItem = {
  id: number
  name: string
  location: string
  racks: Array<{
    id: string
    tags: Array<{}>
    machines: Array<{
      device_id: string
      hostname: string
      ip_address: string
      mac_address: string
    }>
  }>
}

export type ApiLabsResponse = Array<ApiLabsItem>
