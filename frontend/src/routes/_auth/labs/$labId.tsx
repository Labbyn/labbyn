import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import type { TagItem } from '@/integrations/tags/tags.types'
import type { ApiLabsDetailRack } from '@/integrations/labs/labs.types'
import { labQueryOptions } from '@/integrations/labs/labs.query'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/ui/data-table'
import { DataTableColumnHeader } from '@/components/data-table/column-header'
import { TagList } from '@/components/tag-list'
import { SubPageTemplate } from '@/components/subpage-template'

export const Route = createFileRoute('/_auth/labs/$labId')({
  component: RouteComponent,
})

export const columns: Array<ColumnDef<ApiLabsDetailRack>> = [
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
      const tags = row.getValue<Array<TagItem>>('tags')
      return <TagList tags={tags} />
    },
  },
]

function RouteComponent() {
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
                to: '/racks/$racksId',
                params: { racksId: String(row.id) },
              })
            }}
          />
        </>
      }
    />
  )
}
