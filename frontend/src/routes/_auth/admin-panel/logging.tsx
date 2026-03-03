import { createFileRoute } from '@tanstack/react-router'
import { FileText } from 'lucide-react'
import LoggingAdminPanel from '@/components/admin-panel/logging-admin-panel'
import { PageHeader } from '@/components/page-header'

export const Route = createFileRoute('/_auth/admin-panel/logging')({
  component: () => (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Logging Admin Panel"
        description="Welcome to Logs admin panel. Here you can view and manage logs as
        an admin."
        icon={FileText}
      />
      <LoggingAdminPanel />'
    </div>
  ),
})
