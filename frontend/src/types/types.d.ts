export interface Document {
  id: number
  title: string
  content: string
  author: string
  added_on: string
  modified_on: string | null
  version_id: number
}

export type User = {
  id: number
  email: string
  name: string
  surname: string
  login: string
  user_type: string
  force_password_change: boolean
  is_active?: boolean
  is_superuser?: boolean
  is_verified?: boolean
  team_id?: number | null
  version_id?: number
}

export type Machine = {
  id: string
  name: string
  labName: string
  macAddress: string
  pduPort: string
  teamName: string
  operatingSystem: string
  serialNumber: string
  notes?: string
  addedOn: string
  cpu: string
  ram: string
  disk: string
}

export type Device = {
  device_id: string
  hostname: string
  device_type: string
  ip_address: string
  mac_address: string
  status: string
  location?: string
}

export interface Equipment {
  id: string
  type: string
  x: number
  y: number
  label: string
}

export interface Wall {
  id: string
  x1: number
  y1: number
  x2: number
  y2: number
}
