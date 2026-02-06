export type PlatformFormValues = {
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
  cpu?: string
  ram?: string
  disk?: string
  layout?: number
}