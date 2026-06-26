import { useQuery } from '@tanstack/react-query'
import { Badge } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { DataTable } from './ui/data-table'
import { PageIsLoading } from './page-is-loading'
import { DataTableColumnHeader } from './data-table/column-header'
import type { ColumnDef } from '@tanstack/react-table'
import type { fetchMachinesData } from '@/integrations/machines/machines.adapter'
import { formatHeader } from '@/lib/utils'
import { machinesQueryOptions } from '@/integrations/machines/machines.query'

type MachineItem = ReturnType<typeof fetchMachinesData>[number]

export const columns: Array<ColumnDef<MachineItem>> = [
  ...(
    [
      'name',
      'mac_address',
      'ip_address',
      'pdu_port',
      'team_name',
      'os',
      'serial_number',
      'note',
      'added_on',
      'room_name',
    ] as Array<keyof MachineItem>
  ).map((key) => ({
    accessorKey: key,
    header: ({ column }: any) => (
      <DataTableColumnHeader
        column={column}
        title={formatHeader(key as string)}
      />
    ),
    cell: ({ getValue }: { getValue: () => any }) => {
      const value = getValue()

      if (typeof value === 'boolean') {
        return (
          <Badge
            className={
              value
                ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'
                : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
            }
          >
            {value ? 'YES' : 'NO'}
          </Badge>
        )
      }

      return value ?? '-'
    },
  })),
  {
    accessorKey: 'cpus',
    header: ({ column }: any) => (
      <DataTableColumnHeader column={column} title="CPUs" />
    ),
    cell: ({ getValue }: { getValue: () => any }) => {
      const cpus = getValue()
      if (!Array.isArray(cpus) || cpus.length === 0) return '-'
      return (
        <div className="flex flex-col gap-1">
          {cpus.map((cpu: any, idx: number) => (
            <span key={idx} className="text-sm">
              {cpu.name}
            </span>
          ))}
        </div>
      )
    },
  },
  {
    accessorKey: 'ram',
    header: ({ column }: any) => (
      <DataTableColumnHeader column={column} title="RAM" />
    ),
    cell: ({ getValue }: { getValue: () => any }) => {
      const value = getValue()
      return value ? `${value} GB` : '-'
    },
  },
  {
    accessorKey: 'disks',
    header: ({ column }: any) => (
      <DataTableColumnHeader column={column} title="Disks" />
    ),
    cell: ({ getValue }: { getValue: () => any }) => {
      const disks = getValue()
      if (!Array.isArray(disks) || disks.length === 0) return '-'
      return (
        <div className="flex flex-col gap-1">
          {disks.map((disk: any, idx: number) => (
            <span key={idx} className="text-sm">
              {disk.name} {disk.capacity ? `(${disk.capacity} GB)` : ''}
            </span>
          ))}
        </div>
      )
    },
  },
]

export default function MachinesPanel() {
  const { data: machines = [], isLoading } = useQuery(machinesQueryOptions)
  const navigate = useNavigate()

  if (isLoading) return <PageIsLoading />

  return (
    <DataTable
      columns={columns}
      data={machines}
      onRowClick={(row) => {
        navigate({
          to: '/machines/$machineId',
          params: { machineId: String(row.id) },
        })
      }}
    />
  )
}
