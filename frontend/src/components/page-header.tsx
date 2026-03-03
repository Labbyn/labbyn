import type { LucideIcon } from 'lucide-react'

interface pageHeaderProps {
  title: string
  description: string
  icon: LucideIcon
}

export function PageHeader({
  title,
  description,
  icon: Icon,
}: pageHeaderProps) {
  return (
    <header className="flex flex-col gap-1">
      <h1 className="text-4xl font-bold tracking-tight flex items-center gap-2">
        {<Icon className="h-8 w-8 text-primary" />}
        {title}
      </h1>
      <p className="text-xl leading-7 text-muted-foreground">{description}</p>
    </header>
  )
}
