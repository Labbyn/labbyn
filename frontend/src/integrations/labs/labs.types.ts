export interface LabsItem {
  device_id: string
  hostname: string | null
  ip_address: string | null
  mac_address: string | null
}

export interface LabsSection {
  id: string
  tags: Array<string>
  machines: Array<LabsItem>
}

export interface ApiLabsItem {
  id: number
  name: string
  location: string
  racks: Array<LabsSection>
}

export type ApiLabsResponse = Array<ApiLabsItem>
