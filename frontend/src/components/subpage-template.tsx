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
    <div className="flex flex-col h-screen w-full">
      <SubpageHeader {...headerProps} />
      <Separator />
      <ScrollArea className="overflow-hidden w-full">
        <div className="p-6 space-y-6 mx-auto max-w-400">{content}</div>
      </ScrollArea>
    </div>
  )
}
