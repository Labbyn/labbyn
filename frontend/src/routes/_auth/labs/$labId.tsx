import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import type { ApiLabsItem } from '@/integrations/labs/labs.types'
import { labQueryOptions } from '@/integrations/labs/labs.query'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { DataTableColumnHeader } from '@/components/data-table/column-header'
import { Separator } from '@/components/ui/separator'

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
      if (!tags.length) return <span className="text-muted-foreground">-</span>

      return (
        <div className="flex gap-1 flex-wrap">
          {tags.map((tag, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      )
    },
  },
]

function RouteComponent() {
  const router = useRouter()
  const navigate = Route.useNavigate()
  const { labId } = Route.useParams()
  const { data: lab } = useSuspenseQuery(labQueryOptions(labId))

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-background">
      <div className="flex items-center gap-4 bg-background/95 px-6 py-4 backdrop-blur z-10 shrink-0">
        <Button
          onClick={() => router.history.back()}
          variant="ghost"
          size="icon"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight">{lab.name}</h1>
          </div>
        </div>
      </div>
      <Separator />
      <ScrollArea className="h-full">
        <div className="p-6 flex flex-col gap-4">
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
        </div>
      </ScrollArea>
    </div>
  )
}
