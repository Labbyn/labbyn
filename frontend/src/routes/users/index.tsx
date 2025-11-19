import { createFileRoute } from '@tanstack/react-router'
import { ArrowUpDown } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'

export const Route = createFileRoute('/users/')({
  component: RouteComponent,
})

type User = {
  id: string
  name: string
  surname: string
  team: string
  role: string
}

export const users: Array<User> = [
  {
    id: 'u9x2ka',
    name: 'Evelyn',
    surname: 'Reed',
    team: 'Quantum Computing Lab',
    role: 'Lead Physicist',
  },
  {
    id: 'q7m1zp',
    name: 'Marcus',
    surname: 'Chen',
    team: 'Quantum Computing Lab',
    role: 'Cryogenics Engineer',
  },
  {
    id: 'a2k99x',
    name: 'Kenji',
    surname: 'Tanaka',
    team: 'AI Research Facility',
    role: 'Senior ML Engineer',
  },
  {
    id: 'j55qqw',
    name: 'Sarah',
    surname: 'Jennings',
    team: 'AI Research Facility',
    role: 'Data Scientist',
  },
  {
    id: 'n8t11b',
    name: 'Maria',
    surname: 'Gomez',
    team: 'Networking Testbed',
    role: 'Network Architect',
  },
  {
    id: 's77dq1',
    name: 'James',
    surname: 'Holden',
    team: 'Networking Testbed',
    role: 'SysAdmin',
  },
  {
    id: 'b10xy9',
    name: 'Alice',
    surname: 'Wong',
    team: 'Biotech Sequencing Lab',
    role: 'Computational Biologist',
  },
  {
    id: 'r4b77z',
    name: 'Robert',
    surname: 'Lang',
    team: 'Biotech Sequencing Lab',
    role: 'Lab Technician',
  },
  {
    id: 'x99mk2',
    name: 'Emily',
    surname: 'White',
    team: 'Robotics Lab',
    role: 'Robotics Engineer',
  },
  {
    id: 'v33p1q',
    name: 'Michael',
    surname: 'Brown',
    team: 'Robotics Lab',
    role: 'Computer Vision Specialist',
  },
  {
    id: 'h11c44',
    name: 'Chris',
    surname: 'Green',
    team: 'Simulation Hub',
    role: 'HPC Administrator',
  },
  {
    id: 'z88k2m',
    name: 'Patricia',
    surname: 'Blue',
    team: 'Simulation Hub',
    role: 'Simulation Analyst',
  },
]

export const columns: Array<ColumnDef<User>> = [
  {
    accessorKey: 'id',
    header: 'ID',
  },
  {
    accessorKey: 'name',
    header: ({ column }) => {
      return (
        <Button
          variant="link"
          className="has-[>svg]:px-0"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Name
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      )
    },
    cell: ({ row }) => (
      <span>
        {row.getValue('name')} {row.original.surname}
      </span>
    ),
  },
  {
    accessorKey: 'team',
    header: ({ column }) => {
      return (
        <Button
          variant="link"
          className="has-[>svg]:px-0"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Team Name
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      )
    },
  },
  {
    accessorKey: 'role',
    header: ({ column }) => {
      return (
        <Button
          variant="link"
          className="has-[>svg]:px-0"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Role
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      )
    },
  },
]

function RouteComponent() {
  return (
    <div className="p-4">
      <DataTable columns={columns} data={users} />
    </div>
  )
}
