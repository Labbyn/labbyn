import type { ReactNode } from 'react'
import { Separator } from '@/components/ui/separator'

interface AdminPageLayoutProps {
  icon: ReactNode
  title: string
  children: ReactNode
}

export function AdminPageLayout({
  icon,
  title,
  children,
}: AdminPageLayoutProps) {
  return (
    <div className="flex flex-col gap-4 p-4">
      <span className="flex gap-4 items-center">
        {icon}
        {title}
      </span>
      <Separator />
      {children}
    </div>
  )
}
