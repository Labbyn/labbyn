import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Package } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { PageIsLoading } from '@/components/page-is-loading'
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

  if (isLoading) return <PageIsLoading />

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Inventory"
        description="Check where are your items or who is using them"
        icon={Package}
      />
      <ScrollArea className="h-full">
        <CollapseTable inventory={inventory} />
      </ScrollArea>
    </div>
  )
}
