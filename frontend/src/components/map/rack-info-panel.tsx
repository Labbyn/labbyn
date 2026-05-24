import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  ChevronRight,
  Edit2,
  ExternalLink,
  HardDrive,
  Layers,
  Link as LinkIcon,
  Loader2,
  Save,
  Server,
  X,
} from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Link } from '@tanstack/react-router'
import { PlatformWebsocket } from '../platform-websocket'
import type { Equipment } from '@/types/types'
import type { ApiShelfItem } from '@/integrations/shelves/shelves.types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'

import { DndTable } from '@/components/dnd/dnd-table'
import { singleShelfQueryOptions } from '@/integrations/shelves/shelves.query'
import {
  useDeleteShelfMutation,
  useUpdateShelvesOrderMutation,
} from '@/integrations/shelves/shelves.mutation'
import { racksBaseListQueryOptions } from '@/integrations/racks/racks.query'

export function RackInfoPanel({
  rack,
  onClose,
}: {
  rack: Equipment
  onClose: () => void
}) {
  const queryClient = useQueryClient()

  const { data: allRacks } = useQuery(racksBaseListQueryOptions)

  const numericRackId = useMemo(() => {
    const explicitId = (rack as any).rack_id || (rack as any).rackId
    if (explicitId && !isNaN(Number(explicitId))) return explicitId

    if (allRacks && Array.isArray(allRacks)) {
      const matched = allRacks.find(
        (r: any) =>
          String(r.id) === String(rack.id) ||
          r.name === rack.id ||
          r.name === rack.label,
      )
      if (matched) return matched.id
    }

    return rack.id
  }, [rack, allRacks])

  const isIdResolved =
    !isNaN(Number(numericRackId)) &&
    numericRackId !== null &&
    numericRackId !== ''
  const shelfQueryOpts = singleShelfQueryOptions(String(numericRackId))

  const { data: fetchedShelves, isLoading } = useQuery({
    ...shelfQueryOpts,
    enabled: isIdResolved && shelfQueryOpts.enabled !== false,
  })

  const { mutateAsync: updateShelvesOrder, isPending: isUpdatingOrder } =
    useUpdateShelvesOrderMutation(Number(numericRackId) || 0)
  const { mutateAsync: deleteShelf } = useDeleteShelfMutation()

  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [shelvesData, setShelvesData] = useState<Array<ApiShelfItem>>([])
  const [deletedIds, setDeletedIds] = useState<Array<number>>([])
  const [hasOrderChanges, setHasOrderChanges] = useState(false)

  const [selectedShelf, setSelectedShelf] = useState<ApiShelfItem | null>(null)

  useEffect(() => {
    if (fetchedShelves && !isEditing) {
      const sorted = [...fetchedShelves].sort((a, b) => a.order - b.order)
      setShelvesData(sorted)
      setHasOrderChanges(false)

      if (selectedShelf) {
        const updatedSelected = sorted.find((s) => s.id === selectedShelf.id)
        if (updatedSelected) setSelectedShelf(updatedSelected)
      }
    }
  }, [fetchedShelves, isEditing])

  const handleReorder = (reorderedItems: Array<any>) => {
    setShelvesData(reorderedItems as Array<ApiShelfItem>)
    setHasOrderChanges(true)
  }

  const handleDeleteLocal = (id: number) => {
    setShelvesData((prev) => prev.filter((shelf) => shelf.id !== id))
    setDeletedIds((prev) => [...prev, id])
    setHasOrderChanges(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setDeletedIds([])
    setHasOrderChanges(false)
    if (fetchedShelves) {
      setShelvesData([...fetchedShelves].sort((a, b) => a.order - b.order))
    }
  }

  const handleSaveChanges = async () => {
    setIsSaving(true)
    try {
      for (const id of deletedIds) {
        await deleteShelf({ shelfId: id })
      }

      const updates = shelvesData.map((item, index) => ({
        id: item.id,
        order: index + 1,
      }))

      if (updates.length > 0) {
        await updateShelvesOrder(updates)
      }

      queryClient.setQueryData(['shelf', Number(numericRackId)], shelvesData)

      toast.success('Rack shelves updated successfully')
      setDeletedIds([])
      setIsEditing(false)
      setHasOrderChanges(false)
    } catch (error) {
      toast.error('Failed to save changes')
    } finally {
      setIsSaving(false)
    }
  }

  const handleShare = () => {
    const url = new URL(window.location.href)
    url.searchParams.set('redirectId', String(rack.id))
    url.searchParams.set('redirectType', rack.type || 'rack')
    navigator.clipboard.writeText(url.toString())
    toast.success('Link to rack copied to clipboard!')
  }

  return (
    <aside className="absolute inset-y-0 right-0 z-50 flex h-screen w-[420px] flex-col border-l border-border/50 backdrop-blur-2xl bg-card/95 shadow-2xl animate-in slide-in-from-right-8 duration-300">
      <header className="shrink-0 flex items-center justify-between p-5 border-b border-border/50 bg-muted/10">
        <div className="flex items-center gap-3 w-full">
          {selectedShelf ? (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full shrink-0 mr-1"
                onClick={() => setSelectedShelf(null)}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="bg-primary/20 p-2 rounded-xl text-primary shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-bold tracking-tight text-foreground truncate">
                  {selectedShelf.name}
                </h2>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest truncate">
                  {rack.label || `Rack ${rack.id}`}
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="bg-primary/20 p-2 rounded-xl text-primary shrink-0">
                <Server className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-bold tracking-tight text-foreground truncate">
                  {rack.label || `Rack ${rack.id}`}
                </h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                    {rack.type}
                  </Badge>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest truncate">
                    ID: {numericRackId}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-4">
          {!selectedShelf && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full hover:bg-primary/20 hover:text-primary transition-colors"
              onClick={handleShare}
              title="Copy Link to Rack"
            >
              <LinkIcon className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive"
            onClick={onClose}
            disabled={isSaving}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <ScrollArea className="overflow-hidden flex-1">
        {selectedShelf ? (
          /* SHELF DETAILS VIEW */
          <div className="p-5 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <HardDrive className="h-3.5 w-3.5" /> Deployed Machines
              </h3>

              {selectedShelf.machines.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-border/50 rounded-xl bg-muted/10">
                  <p className="text-sm text-muted-foreground font-medium">
                    No machines assigned to this shelf.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedShelf.machines.map((machine) => {
                    return (
                      <div key={machine.id} className="flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2 min-w-0">
                            <Server className="w-4 h-4 text-primary shrink-0" />
                            <span className="font-bold text-sm text-foreground truncate">
                              {machine.name}
                            </span>
                          </div>
                        </div>
                        <PlatformWebsocket
                          instance={machine.ip_address}
                          variant="compact"
                        />
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* RACK OVERVIEW VIEW */
          <div className="p-5 space-y-8 animate-in fade-in duration-200">
            <section className="space-y-4 w-full">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    <Layers className="h-4 w-4" /> Rack Shelves
                  </h3>
                  <Badge variant="secondary" className="text-xs font-bold">
                    {isLoading || !isIdResolved ? '...' : shelvesData.length}
                  </Badge>
                </div>

                {!isEditing ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setIsEditing(true)}
                    disabled={isLoading || !isIdResolved}
                  >
                    <Edit2 className="w-3 h-3 mr-1.5" /> Reorder
                  </Button>
                ) : (
                  <div className="flex items-center gap-1.5 animate-in fade-in">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={handleCancelEdit}
                      disabled={isSaving}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 text-xs"
                      onClick={handleSaveChanges}
                      disabled={isSaving || isUpdatingOrder || !hasOrderChanges}
                    >
                      {isSaving ? (
                        <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                      ) : (
                        <Save className="w-3 h-3 mr-1.5" />
                      )}
                      Save
                    </Button>
                  </div>
                )}
              </div>

              <div className="w-full">
                {isLoading || !isIdResolved ? (
                  <div className="space-y-3">
                    <Skeleton className="h-16 w-full rounded-xl" />
                    <Skeleton className="h-16 w-full rounded-xl" />
                    <Skeleton className="h-16 w-full rounded-xl" />
                  </div>
                ) : shelvesData.length === 0 ? (
                  <Alert className="bg-muted/30 border-border/50 rounded-xl">
                    <AlertTitle className="text-sm font-bold">
                      Empty Rack
                    </AlertTitle>
                    <AlertDescription className="text-xs text-muted-foreground">
                      No shelves have been configured in this rack yet.
                    </AlertDescription>
                  </Alert>
                ) : isEditing ? (
                  <div className="border border-border/50 rounded-xl overflow-hidden bg-background w-full">
                    <div className="w-full [&_.group>div.flex-1]:overflow-x-auto [&_.group>div.flex-1::-webkit-scrollbar]:hidden [&_.group>div.flex-1>span]:shrink-0">
                      <DndTable
                        shelves={shelvesData}
                        onReorder={handleReorder}
                        onDelete={handleDeleteLocal}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-3 w-full">
                    {shelvesData.map((shelf) => (
                      <div
                        key={shelf.id}
                        onClick={() => setSelectedShelf(shelf)}
                        className="group relative flex items-center justify-between w-full p-4 rounded-xl border border-border/50 bg-card/40 hover:bg-primary/5 hover:border-primary/40 hover:shadow-md transition-all cursor-pointer overflow-hidden"
                      >
                        <div className="flex-1 min-w-0 pr-4">
                          <h4 className="font-bold text-sm text-foreground truncate">
                            {shelf.name}
                          </h4>
                          <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground font-medium">
                            <Server className="w-3 h-3" />
                            <span>
                              {shelf.machines.length} Machine
                              {shelf.machines.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                        <div className="shrink-0 w-8 h-8 rounded-full bg-background flex items-center justify-center border border-border/50 group-hover:border-primary/30 group-hover:bg-primary/10 transition-colors">
                          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </ScrollArea>

      <footer className="shrink-0 border-t border-border/50 bg-muted/10 p-3">
        <Button
          variant="secondary"
          className="h-10 w-full text-xs font-bold shadow-sm"
          asChild
        >
          <Link
            to="/racks/$racksId"
            params={{ racksId: numericRackId.toString() }}
          >
            Open rack subpage <ExternalLink />
          </Link>
        </Button>
      </footer>
    </aside>
  )
}
