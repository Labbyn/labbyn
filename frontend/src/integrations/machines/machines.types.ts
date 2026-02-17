export type CPUs = {
  id: number
  name: string
  machine_id: number
}

export type Disks = {
  id: number
  name: string
  capacity: string | null
  machine_id: number
}

export interface MachinesResponse {
  id: number
  name: string
  localization_id: number
  mac_address: string | null
  ip_address: string | null
  pdu_port: number | null
  team_id: number | null
  os: string | null
  serial_number: string | null
  note: string | null
  cpus: Array<CPUs>
  ram: string | null
  disks: Array<Disks>
  metadata_id: number
  shelf_id: number | null
  added_on: string // format: date-time
  version_id: number
}

export interface MetadataResponse {
  id: number
  last_update: string | null
  agent_prometheus: boolean
  ansible_access: boolean
  ansible_root_access: boolean
  version_id: number
}

export interface PlatformFormValues {
  hostname: string
  addToDb: boolean
  scanPlatform: boolean
  deployAgent: boolean
  login?: string
  password?: string
  name?: string
  ip?: string
  mac?: string
  location?: number
  team?: number
  pdu_port?: number
  os?: string
  sn?: string
  note?: string
  cpu?: Array<CPUs>
  ram?: string
  disk?: Array<Disks>
  layout?: number
}

export interface MachineUpdate {
  name?: string | null
  localization_id?: number | null
  mac_address?: string | null
  ip_address?: string | null
  pdu_port?: number | null
  team_id?: number | null
  os?: string | null
  serial_number?: string | null
  note?: string | null
  cpu?: Array<CPUs> | null
  ram?: string | null
  disk?: Array<Disks> | null
  layout_id?: number | null
  metadata_id?: number | null
}

export type ApiMachineItem = MachinesResponse
export type ApiMachineResponse = Array<MachinesResponse>
