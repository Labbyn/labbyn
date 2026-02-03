import { createFileRoute } from '@tanstack/react-router'
import { FileText } from 'lucide-react'
import { AdminPageLayout } from '@/components/admin-panel/admin-page-layout'
import LoggingAdminPanel from '@/components/admin-panel/logging-admin-panel'

export const Route = createFileRoute('/_auth/admin-panel/logging')({
  component: () => (
    <AdminPageLayout
      icon={<FileText />}
      title="Welcome to Logs admin panel. Here you can view and manage logs as
        an admin."
    >
      <LoggingAdminPanel />
    </AdminPageLayout>
  ),
})
