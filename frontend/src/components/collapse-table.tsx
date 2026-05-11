import { ChevronDown } from 'lucide-react'
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

export function CollapseTable({
  inventory,
}: {
  inventory: ApiCategoryInventoryGroupedResponse
}) {
  const navigate = useNavigate()
  return (
    <div className="w-full sm:p-4">
      <div className="rounded-md sm:border overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="font-medium">Category</TableHead>
              <TableHead className="font-medium">Total Quantity</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>

          {inventory.map((category) => (
            <Collapsible key={category.id} asChild>
              <TableBody>
                <TableRow className="group">
                  <TableCell>{category.category_name}</TableCell>
                  <TableCell>{category.quantity}</TableCell>
                  <TableCell className="text-right">
                    <CollapsibleTrigger className="p-2 rounded-md [&[data-state=open]>svg]:rotate-180">
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      <span className="sr-only">Toggle details</span>
                    </CollapsibleTrigger>
                  </TableCell>
                </TableRow>

                <CollapsibleContent asChild>
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={6} className="p-0">
                      <div className="bg-muted/30 px-6 py-4 text-sm text-muted-foreground shadow-inner">
                        <div className="space-y-3">
                          {category.item_group.map((item) => (
                            <div
                              key={item.id}
                              className="bg-background p-3 border rounded-sm items-center cursor-pointer transition-colors hover:bg-muted/80"
                              onClick={() =>
                                navigate({
                                  to: '/inventory/$inventoryId',
                                  params: { inventoryId: String(item.id) },
                                })
                              }
                            >
                              <div>
                                <span className="text-xs font-medium uppercase text-muted-foreground block">
                                  Name
                                </span>
                                <span className="text-foreground">
                                  {item.name}
                                </span>
                              </div>
                              <div>
                                <span className="text-xs font-medium uppercase text-muted-foreground block">
                                  Room
                                </span>
                                <span className="text-foreground">
                                  {item.room_name}
                                </span>
                              </div>
                              <div>
                                <span className="text-xs font-medium uppercase text-muted-foreground block">
                                  Quantity
                                </span>
                                <span className="text-foreground">
                                  {item.quantity}
                                </span>
                              </div>
                              <div>
                                <span className="text-xs font-medium uppercase text-muted-foreground block">
                                  Team
                                </span>
                                <span className="text-foreground">
                                  {item.team_name}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                </CollapsibleContent>
              </TableBody>
            </Collapsible>
          ))}
        </Table>
      </div>
    </div>
  )
}
