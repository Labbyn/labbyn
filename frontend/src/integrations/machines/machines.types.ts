export type ApiMachineItem = {
  id: number
  name: string
  localization_id: number | null
  mac_address: string | null
  ip_address: string | null
  pdu_port: number | null
  team_id: number | null
  os: string | null
  serial_number: string | null
  note: string | null
  added_on: string | null
  cpu: string | null
  ram: string | null
  disk: string | null
  metadata_id: number
  layout_id: number | null
  version_id: number | null
}
export type ApiMachineResponse = Array<ApiMachineItem>
