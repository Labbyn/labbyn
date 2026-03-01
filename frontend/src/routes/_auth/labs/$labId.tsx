import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { ArrowLeft, Box } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import type { ApiLabsItem } from '@/integrations/labs/labs.types'
import { labQueryOptions } from '@/integrations/labs/labs.query'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { DataTableColumnHeader } from '@/components/data-table/column-header'
import { Separator } from '@/components/ui/separator'
import { TagList } from '@/components/tag-list'
import { SubPageTemplate } from '@/components/subpage-template'
import { SubpageCard } from '@/components/subpage-card'

type RackItem = ApiLabsItem['racks'][number]

export const Route = createFileRoute('/_auth/labs/$labId')({
  component: RouteComponent,
})

export const columns: Array<ColumnDef<RackItem>> = [
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Rack name" />
    ),
    cell: ({ row }) => (
      <div className="flex flex-col font-medium">
        {row.getValue('name') || '-'}
      </div>
    ),
  },
  {
    id: 'machine_count',
    accessorFn: (row) => row.machines.length,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Total Machines" />
    ),
    cell: ({ row }) => (
      <div className="flex justify-center">
        <Badge variant="outline" className="w-fit">
          {row.original.machines.length}
        </Badge>
      </div>
    ),
  },
  {
    accessorKey: 'tags',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Tags" />
    ),
    cell: ({ row }) => {
      const tags = row.getValue<Array<string>>('tags')

      return <TagList tags={tags} />
    },
  },
]

function RouteComponent() {
  const router = useRouter()
  const navigate = Route.useNavigate()
  const { labId } = Route.useParams()
  const { data: lab } = useSuspenseQuery(labQueryOptions(labId))

  return (
    <SubPageTemplate
      headerProps={{
        title: lab.name,
      }}
      content={
        <>
          <DataTable
            columns={columns}
            data={lab.racks}
            onRowClick={(row) => {
              navigate({
                to: '/racks/$rackId',
                params: { rackId: String(row.id) },
              })
            }}
          />
        </>
      }
    />
  )
}
