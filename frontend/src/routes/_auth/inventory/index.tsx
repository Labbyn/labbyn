import { Link, createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Package } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import type { ApiInventoryInfoItem } from '@/integrations/inventory/inventory.types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { PageIsLoading } from '@/components/page-is-loading'
import { DataTableColumnHeader } from '@/components/data-table/column-header'
import { PageHeader } from '@/components/page-header'
import { CollapseTable } from '@/components/collapse-table'
import { categoryGroupedInventoryListQueryOptions } from '@/integrations/category/category.query'

export const Route = createFileRoute('/_auth/inventory/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { data: inventory = [], isLoading } = useQuery(
    categoryGroupedInventoryListQueryOptions,
  )
  
  const navigate = Route.useNavigate()
  if (isLoading) return <PageIsLoading />

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Inventory"
        description="Check where are your items or who is using them"
        icon={Package}
      />
      <ScrollArea className="h-full">
        <CollapseTable
          inventory={inventory}/>
      </ScrollArea>
    </div>
  )
}
