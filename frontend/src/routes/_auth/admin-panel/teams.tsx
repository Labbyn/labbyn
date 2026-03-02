import { createFileRoute } from '@tanstack/react-router'
import { CirclePile } from 'lucide-react'
import TeamsAdminPanel from '@/components/admin-panel/teams-admin-panel'
import { PageHeader } from '@/components/page-header'

export const Route = createFileRoute('/_auth/admin-panel/teams')({
  component: () => (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Teams Admin Panel"
        description="Welcome to Teams admin panel. Here you can view and manage teams as an
        admin."
        icon={CirclePile}
      />

      <TeamsAdminPanel />
    </div>
  ),
})
