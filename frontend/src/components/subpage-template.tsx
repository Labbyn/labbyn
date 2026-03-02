import { SubpageHeader } from './subpage-header'
import { Separator } from './ui/separator'
import { ScrollArea } from './ui/scroll-area'
import type { SubpageHeaderProps } from './subpage-header'

interface SubPageProps {
  headerProps: SubpageHeaderProps
  content: React.ReactNode
}

export function SubPageTemplate({ headerProps, content }: SubPageProps) {
  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-background">
      <SubpageHeader {...headerProps} />
      <Separator />
      <ScrollArea className="h-full bg-slate-50/50 dark:bg-zinc-950/50">
        <div className="p-8 max-w-[1600px] mx-auto space-y-8">{content}</div>
      </ScrollArea>
    </div>
  )
}
