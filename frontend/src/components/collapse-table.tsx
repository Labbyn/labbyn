import { ChevronDown, Layers, MapPin } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import type { ApiCategoryInventoryGroupedResponse } from '@/integrations/category/category.types'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export function CollapseTable({
  inventory,
}: {
  inventory: ApiCategoryInventoryGroupedResponse
}) {
  const navigate = useNavigate()

  if (inventory.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
        No inventory to display
      </div>
    )
  }

  return (
    <div className="w-full sm:p-4">
      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="hover:bg-transparent">
              <TableHead className="font-semibold text-muted-foreground">
                Category
              </TableHead>
              <TableHead className="font-semibold text-muted-foreground">
                Amount
              </TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {inventory.map((category) => (
              <Collapsible key={category.category_name} asChild>
                <>
                  <TableRow className="group cursor-pointer transition-colors hover:bg-muted/30">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Layers className="h-4 w-4 text-muted-foreground" />
                        {category.category_name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{category.quantity} units</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <CollapsibleTrigger className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted [&[data-state=open]>svg]:rotate-180">
                        <ChevronDown className="h-4 w-4 transition-transform duration-200" />
                        <span className="sr-only">Show details</span>
                      </CollapsibleTrigger>
                    </TableCell>
                  </TableRow>

                  <CollapsibleContent asChild>
                    <TableRow className="border-b-0 hover:bg-transparent">
                      <TableCell colSpan={3} className="p-0 border-b">
                        <div className="bg-muted/10 p-4 shadow-inner sm:p-6">
                          <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Inventory details
                          </h4>

                          {/* Inventory grid */}
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            {category.item_group.map((item) => (
                              <div
                                key={item.id}
                                onClick={() =>
                                  navigate({
                                    to: '/inventory/$inventoryId',
                                    params: { inventoryId: String(item.id) },
                                  })
                                }
                                className="group/item flex cursor-pointer flex-col justify-between space-y-3 rounded-lg border bg-background p-4 shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <p className="truncate font-medium leading-tight transition-colors group-hover/item:text-primary">
                                    {item.name}
                                  </p>
                                  <Badge variant="outline">
                                    {item.quantity} units
                                  </Badge>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                                  <div
                                    className="flex items-center gap-1.5"
                                    title="Location"
                                  >
                                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                                    <span>{item.room_name}</span>
                                  </div>
                                  <div
                                    className="flex items-center gap-1.5"
                                    title="Team"
                                  ></div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  </CollapsibleContent>
                </>
              </Collapsible>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
