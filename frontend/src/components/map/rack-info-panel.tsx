import React, { useEffect, useState } from 'react'
import {
  Activity,
  CheckCircle2,
  Cpu,
  Edit2,
  Layers,
  Loader2,
  Save,
  Server,
  Thermometer,
  Wind,
  X,
  Zap,
} from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Equipment } from '@/types/types'
import type { ApiShelfItem } from '@/integrations/shelves/shelves.types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'

import { DndTable } from '@/components/dnd/dnd-table'
import { singleShelfQueryOptions } from '@/integrations/shelves/shelves.query'
import {
  useDeleteShelfMutation,
  useUpdateShelvesOrderMutation,
} from '@/integrations/shelves/shelves.mutation'

export function RackInfoPanel({
  rack,
  onClose,
}: {
  rack: Equipment
  onClose: () => void
}) {
  const queryClient = useQueryClient()

  const { data: fetchedShelves, isLoading } = useQuery(
    singleShelfQueryOptions(String(rack.id)),
  )

  const { mutateAsync: updateShelvesOrder } = useUpdateShelvesOrderMutation(
    rack.id,
  )
  const { mutateAsync: deleteShelf } = useDeleteShelfMutation()

  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [shelvesData, setShelvesData] = useState<Array<ApiShelfItem>>([])
  const [deletedIds, setDeletedIds] = useState<Array<number>>([])

  useEffect(() => {
    if (fetchedShelves && !isEditing) {
      const sorted = [...fetchedShelves].sort((a, b) => a.order - b.order)
      setShelvesData(sorted)
    }
  }, [fetchedShelves, isEditing])

  const handleReorder = (reorderedItems: Array<any>) => {
    setShelvesData(reorderedItems as Array<ApiShelfItem>)
  }

  const handleDeleteLocal = (id: number) => {
    setShelvesData((prev) => prev.filter((shelf) => shelf.id !== id))
    setDeletedIds((prev) => [...prev, id])
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setDeletedIds([])
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
      await updateShelvesOrder(updates)

      queryClient.setQueryData(['shelf', String(rack.id)], shelvesData)

      toast.success('Rack shelves updated successfully')
      setDeletedIds([])
      setIsEditing(false)
    } catch (error) {
      toast.error('Failed to save changes')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <aside className="absolute inset-y-0 right-0 z-50 flex h-full w-112.5 flex-col border border-border/40 backdrop-blur-md bg-card/50 shadow-2xl animate-in slide-in-from-right">
      <header className="flex shrink-0 items-start justify-between p-4">
        <div className="space-y-1">
          <h2 className="flex items-center gap-2 text-2xl font-semibold w-70 truncate">
            {rack.label || rack.id || 'Unnamed Rack'}
            <Server className="inline-block ml-2 shrink-0" />
          </h2>
          <div className="flex gap-2">
            <Badge variant="secondary">{rack.type}</Badge>
            <Badge variant="destructive">
              #{rack.id.toString().split('-')[0]}
            </Badge>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full shrink-0"
          onClick={onClose}
          disabled={isSaving}
        >
          <X />
        </Button>
      </header>

      <ScrollArea className="flex-1">
        <div className="space-y-6 p-4">
          <Alert className="border-emerald-500/50 bg-emerald-500/15">
            <CheckCircle2 className=" text-emerald-500" />
            <AlertTitle className="font-bold uppercase tracking-widest text-emerald-500">
              System Healthy
            </AlertTitle>
            <AlertDescription className="text-muted-foreground">
              Uptime: 45d 12h
            </AlertDescription>
          </Alert>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Activity className="h-3 w-3" /> Real-time Sensors Data
              </h3>
            </div>

            <div className="grid grid-cols-3 gap-3 [&_svg]:h-5 [&_svg]:w-5">
              <MetricCard
                icon={<Thermometer className="text-orange-500" />}
                label="Inlet Temp"
                value="22°C"
              />

              <MetricCard
                icon={<Zap className="text-yellow-500" />}
                label="PUE Factor"
                value="1.14"
              />

              <MetricCard
                icon={<Wind className="text-blue-400" />}
                label="Airflow"
                value="450 CFM"
              />
            </div>
          </section>

          <Separator className="opacity-50" />

          {/* Shelves Section */}
          {/* @TODO refactor shelfs */}
          <section className="space-y-3 w-full overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  <Layers className="h-3.5 w-3.5" /> Rack Shelves
                </h3>
                <Badge variant="secondary" className="text-xs">
                  {isLoading ? '...' : shelvesData.length} Shelves
                </Badge>
              </div>

              {/* Edit Mode Buttons */}
              {!isEditing ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => setIsEditing(true)}
                  disabled={isLoading}
                >
                  <Edit2 className="w-3 h-3 mr-1.5" /> Edit
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
                    disabled={isSaving}
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

            <div className="border border-border/50 rounded-xl overflow-hidden bg-background w-full max-w-104">
              {isLoading ? (
                <div className="p-4 space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : shelvesData.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No shelves configured in this rack yet.
                </div>
              ) : isEditing ? (
                /* Interactive Drag and Drop Table */
                <div
                  className="
                  w-full
                  [&_.group>div.flex-1]:overflow-x-auto 
                  [&_.group>div.flex-1]:overflow-y-hidden 
                  [&_.group>div.flex-1::-webkit-scrollbar]:hidden 
                  [&_.group>div.flex-1]:[-ms-overflow-style:none] 
                  [&_.group>div.flex-1]:[scrollbar-width:none] 
                  [&_.group>div.flex-1>span]:shrink-0 
                  [&_.group>div.flex-1>span]:max-w-35 
                  [&_.group>div.flex-1>span]:inline-block
                "
                >
                  <DndTable
                    shelves={shelvesData}
                    onReorder={handleReorder}
                    onDelete={handleDeleteLocal}
                  />
                </div>
              ) : (
                <div className="w-full">
                  {shelvesData.map((shelf) => (
                    <div
                      key={shelf.id}
                      className="flex flex-col space-y-3 w-full px-4 py-2"
                    >
                      <div className="group relative flex flex-row items-center justify-between w-full h-12 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-all overflow-hidden">
                        <div className="font-bold text-sm min-w-16 max-w-20 truncate text-foreground shrink-0 mr-4">
                          {shelf.name}
                        </div>

                        <div className="flex flex-1 items-center justify-start gap-3 overflow-x-auto scrollbar-width-none [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                          {shelf.machines.map((item) => (
                            <span
                              key={item.id}
                              className="flex items-center shrink-0 bg-background border rounded-md px-2 py-1 max-w-35 text-xs font-medium truncate opacity-80"
                            >
                              {item.name}
                            </span>
                          ))}
                          {shelf.machines.length === 0 && (
                            <span className="text-xs italic opacity-40 shrink-0">
                              Empty Shelf
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <div className="space-y-4">
            <section className="space-y-2">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Cpu className="h-3 w-3" /> CPU Load
                </span>
                <span className="text-primary">78%</span>
              </div>
              <Progress value={78} className="h-1 bg-muted/30" />
            </section>
          </div>
        </div>
      </ScrollArea>

      <footer className="shrink-0 border-t bg-muted/20 p-4">
        <Button
          className="h-9 w-full text-[10px] font-bold uppercase tracking-widest"
          size="sm"
        >
          Manage Infrastructure
        </Button>
      </footer>
    </aside>
  )
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <Card className="border-accent-foreground/50 bg-card/30 shadow-none p-3">
      <CardContent className="flex flex-col items-center text-center p-0">
        <div className="mb-2 rounded-full border border-border/40 bg-background p-1.5">
          {icon}
        </div>
        <span className="text-lg font-bold tracking-tighter tabular-nums leading-none">
          {value}
        </span>
        <span className="mt-1 text-[8px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          {label}
        </span>
      </CardContent>
    </Card>
  )
}
