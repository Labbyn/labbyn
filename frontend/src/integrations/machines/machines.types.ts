import type { ApiTagsItem } from '../tags/tags.types'

export type CPU = {
  id: number
  name: string
  machine_id: number
}

export type Disk = {
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
  cpus: Array<CPU>
  ram: string | null
  disks: Array<Disk>
  metadata_id: number
  shelf_id: number | null
  added_on: string // format: date-time
  version_id: number
}

export interface ApiMachineInfo {
  id: number
  name: string
  ip_address: string
  mac_address: string
  os: string
  cpus: Array<CPU>
  ram: string | null
  disks: Array<Disk>
  serial_number: string | null
  note: string | null
  pdu_port: number
  added_on: string // format: date-time
  shelf_number: number | null
  shelf_id: number | null
  team_id: string | null
  team_name: string
  rack_id: number | null
  rack_name: string
  room_name: string
  room_id: number | null
  last_update: string // format: date-time
  monitoring: boolean
  ansible_access: boolean
  ansible_root_access: boolean
  tags: Array<ApiTagsItem>
  network_status: string
  prometheus_live_stats: ApiMachineInfoPrometheus
  grafana_link: string
  rack_link: string
  map_link: string
}

export interface ApiMachineInfoPrometheus {
  cpu_usage: string | null
  ram_usage: string | null
  disks: Array<Disk>
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
  ip_address?: string
  mac_address?: string
  localization_id?: number
  team_id?: number
  pdu_port?: number
  os?: string
  serial_number?: string
  note?: string
  cpus?: Array<CPU>
  ram?: string
  disks?: Array<Disk>
  shelf_id?: number
}

export interface MachineUpdate {
  name?: string | null
  room_id?: number | null
  mac_address?: string | null
  ip_address?: string | null
  pdu_port?: number | null
  team_id?: string | null
  os?: string | null
  serial_number?: string | null
  note?: string | null
  cpus?: Array<CPU> | null
  ram?: string | null
  disks?: Array<Disk> | null
  shelf_id?: number | null
  metadata_id?: number | null
}

export interface AutoDiscoverPayload {
  host: string
  extra_vars: {
    ansible_user: string
    ansible_password: string
  }
}

export interface AgentDialogPayload {
  host: string
  username: string
  password: string
}

export type ApiMachineItem = MachinesResponse
export type ApiMachineInfoResponse = Array<ApiMachineInfo>
export type ApiMachineResponse = Array<MachinesResponse>
