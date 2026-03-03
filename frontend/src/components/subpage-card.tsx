import type { LucideIcon } from 'lucide-react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

interface SubpageCardProps {
  title: string
  description: string
  content: React.ReactNode
  type?: string
  Icon: LucideIcon
}

export function SubpageCard({
  title,
  description,
  content,
  type = 'info',
  Icon,
}: SubpageCardProps) {
  const contentStyle =
    type === 'table'
      ? 'px-5'
      : type === 'info'
        ? 'grid gap-6 sm:grid-cols-2'
        : ''
  return (
    <Card className="pt-0 overflow-hidden">
      <CardHeader className="px-6 py-6 border-b bg-muted/30">
        <CardTitle className="flex items-center gap-2">
          {<Icon className="h-5 w-5 text-primary" />}
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className={contentStyle}>{content}</CardContent>
    </Card>
  )
}
