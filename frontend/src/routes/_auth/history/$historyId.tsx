import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import {
  AlarmClock,
  ArrowLeft,
  CircleQuestionMark,
  Clapperboard,
  ClipboardList,
  FolderInput,
  FolderOutput,
  RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { singleHistoryQueryOptions } from '@/integrations/history/history.query'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

export const Route = createFileRoute('/_auth/history/$historyId')({
  component: HistoryDetailsPage,
})

function HistoryDetailsPage() {
  const router = useRouter()
  const { historyId } = Route.useParams()
  const { data: history } = useSuspenseQuery(
    singleHistoryQueryOptions(historyId),
  )

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* Header*/}
      <div className="flex items-center gap-4 bg-background/95 px-6 py-4 backdrop-blur sticky top-0 z-10">
        <Button
          onClick={() => router.history.back()}
          variant="ghost"
          size="icon"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight">#{history.id}</h1>
          </div>
        </div>
      </div>
      <Separator />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto grid gap-6 grid-cols-1 md:grid-cols-2">
          {/* History information */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-muted-foreground" />
                History
              </CardTitle>
              <CardDescription>History general information</CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="grid gap-6 sm:grid-cols-2 md:grid-cols-4">
              {[
                {
                  label: 'Entity type',
                  name: 'entity_type',
                  icon: CircleQuestionMark,
                },
                { label: 'Action', name: 'action', icon: Clapperboard },
                {
                  label: 'Can rollback',
                  name: 'can_rollback',
                  icon: RotateCcw,
                },
                { label: 'Occured', name: 'timestamp', icon: AlarmClock },
              ].map((field) => {
                const rawValue = (history as any)[field.name]
                const isDateField = field.name === 'timestamp'
                const canRollback = field.name === "can_rollback"
                const displayValue =
                  isDateField && rawValue
                    ? new Date(rawValue).toLocaleString('en-CA', {
                        hour12: false,
                      })
                    : rawValue

                return (
                  <div key={field.name} className="grid gap-2">
                    <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <field.icon className="h-5 w-5" /> {field.label}
                    </span>
                    <span className="font-medium">{canRollback
                            ? rawValue
                              ? 'Yes'
                              : 'No'
                            : displayValue}</span>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {/* Before state */}
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderOutput className="h-5 w-5 text-muted-foreground" />
                Before state
              </CardTitle>
              <CardDescription>State before appyling changes</CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="pt-6">
              <div className="flex flex-col gap-2">
                <pre className="text-sm font-mono leading-relaxed text-red-600 dark:text-red-400 whitespace-pre-wrap break-all">
                      {JSON.stringify(history.before_state, null, 2)}
                </pre>
              </div>
            </CardContent>
          </Card>

          {/* After state */}
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderInput className="h-5 w-5 text-muted-foreground" />
                After state
              </CardTitle>
              <CardDescription>State after applying changes</CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="pt-6">
              <div className="flex flex-col gap-2">
                <pre className="text-sm font-mono leading-relaxed text-green-600 dark:text-green-400 whitespace-pre-wrap break-all">
                  {JSON.stringify(history.after_state, null, 2)}
                </pre>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
