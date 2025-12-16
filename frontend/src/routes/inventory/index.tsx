import { createFileRoute } from '@tanstack/react-router'
import { ArrowUpDown } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { ScrollArea } from '@/components/ui/scroll-area'

export const Route = createFileRoute('/inventory/')({
  component: RouteComponent,
})
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

export const machines: Array<Machine> = [
  {
    id: 'm1',
    name: 'GP-NODE-01',
    labName: 'Quantum Computing',
    macAddress: '00:1B:44:11:3A:B7',
    pduPort: 'PDU-A-14',
    teamName: 'Infrastructure',
    operatingSystem: 'Ubuntu 22.04 LTS',
    serialNumber: 'SN-992831',
    notes: 'Reserved for lattice simulations.',
    addedOn: '2023-10-15',
    cpu: 'AMD EPYC 7763',
    ram: '512GB',
    disk: '4TB NVMe',
  },
  {
    id: 'm2',
    name: 'VIS-STATION-04',
    labName: 'Robotics Lab',
    macAddress: 'AC:DE:48:00:11:22',
    pduPort: 'PDU-B-02',
    teamName: 'Computer Vision',
    operatingSystem: 'Windows 11 Pro',
    serialNumber: 'MXL2030AB',
    notes: '',
    addedOn: '2024-01-10',
    cpu: 'Intel i9-13900K',
    ram: '128GB',
    disk: '2TB SSD',
  },
  {
    id: 'm3',
    name: 'DB-SHARD-09',
    labName: 'Simulation Hub',
    macAddress: '50:6B:8D:99:4F:11',
    pduPort: 'PDU-C-22',
    teamName: 'Data Engineering',
    operatingSystem: 'RHEL 9.1',
    serialNumber: 'DELL-44920',
    notes: 'Running critical datasets.',
    addedOn: '2023-11-05',
    cpu: 'Intel Xeon Gold',
    ram: '256GB',
    disk: '10TB HDD RAID',
  },
  {
    id: 'm4',
    name: 'ML-TRAIN-ALPHA',
    labName: 'AI Research Facility',
    macAddress: '12:34:56:78:9A:BC',
    pduPort: 'PDU-A-01',
    teamName: 'AI Research',
    operatingSystem: 'Ubuntu 20.04',
    serialNumber: 'NVD-DGX-001',
    notes: 'Dedicated to LLM training.',
    addedOn: '2024-02-20',
    cpu: 'Dual AMD EPYC',
    ram: '2TB',
    disk: '30TB NVMe',
  },
  {
    id: 'm5',
    name: 'GENOME-SEQ-02',
    labName: 'Biotech Sequencing',
    macAddress: 'AA:BB:CC:11:22:33',
    pduPort: 'PDU-D-05',
    teamName: 'Genomics',
    operatingSystem: 'CentOS 7',
    serialNumber: 'ILMN-SEQ-55',
    notes: 'Legacy pipeline support.',
    addedOn: '2022-08-12',
    cpu: 'Intel Xeon Silver',
    ram: '64GB',
    disk: '8TB HDD',
  },
  {
    id: 'm6',
    name: 'FW-EDGE-01',
    labName: 'Networking Testbed',
    macAddress: '00:00:5E:00:53:AF',
    pduPort: 'PDU-E-12',
    teamName: 'Network Security',
    operatingSystem: 'Pfsense Custom',
    serialNumber: 'NET-RT-99',
    notes: 'Main gateway firewall.',
    addedOn: '2023-05-30',
    cpu: 'Intel Atom C3000',
    ram: '16GB',
    disk: '512GB SSD',
  },
  {
    id: 'm7',
    name: 'CRYO-CTRL-03',
    labName: 'Quantum Computing',
    macAddress: '98:76:54:32:10:FE',
    pduPort: 'PDU-A-09',
    teamName: 'Cryogenics',
    operatingSystem: 'Windows 10 IoT',
    serialNumber: 'LKS-CRYO-88',
    notes: 'Do not patch without vendor approval.',
    addedOn: '2023-01-15',
    cpu: 'Intel i5-11400',
    ram: '32GB',
    disk: '1TB SSD',
  },
  {
    id: 'm8',
    name: 'RENDER-FARM-10',
    labName: 'Simulation Hub',
    macAddress: '11:22:33:44:55:66',
    pduPort: 'PDU-C-18',
    teamName: 'Visualization',
    operatingSystem: 'Ubuntu 22.04',
    serialNumber: 'RF-NODE-X10',
    notes: '',
    addedOn: '2024-03-01',
    cpu: 'AMD Threadripper',
    ram: '128GB',
    disk: '2TB NVMe',
  },
  {
    id: 'm9',
    name: 'BIO-NAS-01',
    labName: 'Biotech Sequencing',
    macAddress: 'FF:EE:DD:CC:BB:AA',
    pduPort: 'PDU-D-01',
    teamName: 'Storage Ops',
    operatingSystem: 'TrueNAS Scale',
    serialNumber: 'IX-NAS-400',
    notes: 'Primary backup target.',
    addedOn: '2023-09-22',
    cpu: 'Intel Xeon Bronze',
    ram: '64GB',
    disk: '100TB RAIDZ2',
  },
  {
    id: 'm10',
    name: 'ARM-CTRL-X1',
    labName: 'Robotics Lab',
    macAddress: 'A1:B2:C3:D4:E5:F6',
    pduPort: 'PDU-B-11',
    teamName: 'Motion Control',
    operatingSystem: 'ROS 2 / Ubuntu Real-time',
    serialNumber: 'KUKA-ARM-001',
    notes: 'Experimental firmware.',
    addedOn: '2024-04-05',
    cpu: 'NVIDIA Jetson AGX',
    ram: '32GB',
    disk: '64GB eMMC',
  },
]

export const columns: Array<ColumnDef<Machine>> = [
  {
    accessorKey: 'name',
    header: ({ column }) => {
      return (
        <Button
          variant="link"
          className="has-[>svg]:px-0"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Name / Serial
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      )
    },
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium">{row.getValue('name')}</span>
        <span className="text-xs text-muted-foreground">
          {row.original.serialNumber}
        </span>
      </div>
    ),
  },
  {
    accessorKey: 'labName',
    header: ({ column }) => {
      return (
        <Button
          variant="link"
          className="has-[>svg]:px-0"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Lab & Team
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      )
    },
    cell: ({ row }) => (
      <div className="flex flex-col gap-1">
        <Badge variant="outline" className="w-fit">
          {row.getValue('labName')}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {row.original.teamName}
        </span>
      </div>
    ),
  },
  {
    accessorKey: 'macAddress',
    header: 'Network Info',
    cell: ({ row }) => (
      <div className="flex flex-col font-mono text-xs">
        <span>{row.getValue('macAddress')}</span>
        <span className="text-muted-foreground">
          Port: {row.original.pduPort}
        </span>
      </div>
    ),
  },
  {
    accessorKey: 'operatingSystem',
    header: 'OS',
  },
  {
    id: 'specs',
    header: 'Hardware Specs',
    cell: ({ row }) => (
      <div className="text-sm">
        <div className="font-medium">{row.original.cpu}</div>
        <div className="text-xs text-muted-foreground">
          {row.original.ram} | {row.original.disk}
        </div>
      </div>
    ),
  },
  {
    accessorKey: 'addedOn',
    header: ({ column }) => {
      return (
        <Button
          variant="link"
          className="has-[>svg]:px-0"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Date Added
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const date = new Date(row.getValue('addedOn'))
      return <div className="font-medium">{date.toLocaleDateString()}</div>
    },
  },
  {
    accessorKey: 'notes',
    header: 'Notes',
    cell: ({ row }) => (
      <div className="max-w-[200px] truncate text-muted-foreground italic">
        {row.getValue('notes') || '-'}
      </div>
    ),
  },
]

function RouteComponent() {
  return (
    <div className="h-screen w-full z-1 overflow-hidden">
      <ScrollArea className="h-full">
        <div className='p-6'>
          <DataTable columns={columns} data={machines} /> 
        </div>
      </ScrollArea>
    </div>
  )
}
