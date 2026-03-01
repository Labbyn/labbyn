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
  Info,
  Redo,
  RotateCcw,
  Undo,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { convertTimestampToDate } from '@/utils'
import { singleHistoryQueryOptions } from '@/integrations/history/history.query'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { SubPageTemplate } from '@/components/subpage-template'
import { SubpageCard } from '@/components/subpage-card'

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
    <SubPageTemplate
      headerProps={{
        title: `#${history.id}`,
      }}
      content={
        <>
          {/* History Information */}
          <SubpageCard
            title={'History'}
            description={'History general information'}
            type="info"
            Icon={Info}
            content={
              <>
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
                ].map((field, index, array) => {
                  const rawValue = (history as any)[field.name]
                  const isDateField = field.name === 'timestamp'
                  const canRollback = field.name === 'can_rollback'

                  const displayValue =
                    isDateField && rawValue
                      ? convertTimestampToDate(rawValue)
                      : rawValue

                  return (
                    <div
                      key={field.name}
                      className={`flex flex-col gap-1.5 py-3 ${
                        index !== array.length - 1
                          ? 'border-b border-border/50'
                          : ''
                      }`}
                    >
                      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-tight text-muted-foreground/80">
                        <field.icon className="h-3.5 w-3.5" />
                        {field.label}
                      </div>

                      <div className="flex flex-col gap-2 min-h-[32px] justify-center">
                        <div className="text-sm font-medium text-foreground flex flex-col gap-1">
                          <span className="truncate">
                            {canRollback
                              ? rawValue
                                ? 'Yes'
                                : 'No'
                              : displayValue || '—'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </>
            }
          />
          {/* Before state Section */}
          <SubpageCard
            title={'Before state'}
            description={'State before appyling changes'}
            type="info"
            Icon={Undo}
            content={
              <>
                <div className="flex flex-col gap-2">
                  <pre className="text-sm font-mono leading-relaxed text-red-600 dark:text-red-400 whitespace-pre-wrap break-all">
                    {JSON.stringify(history.before_state, null, 2)}
                  </pre>
                </div>
              </>
            }
          />
          {/* After state Section */}
          <SubpageCard
            title={'After state'}
            description={'State after applying changes'}
            type="info"
            Icon={Redo}
            content={
              <>
                <div className="flex flex-col gap-2">
                  <pre className="text-sm font-mono leading-relaxed text-green-600 dark:text-green-400 whitespace-pre-wrap break-all">
                    {JSON.stringify(history.after_state, null, 2)}
                  </pre>
                </div>
              </>
            }
          />
        </>
      }
    />
  )
}
