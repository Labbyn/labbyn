import { createFileRoute } from '@tanstack/react-router'
import { CirclePile } from 'lucide-react'
import TeamsAdminPanel from '@/components/admin-panel/teams-admin-panel'
import { AdminPageLayout } from '@/components/admin-panel/admin-page-layout'

export const Route = createFileRoute('/_auth/admin-panel/teams')({
  component: () => (
    <AdminPageLayout
      icon={<CirclePile />}
      title="Welcome to Teams admin panel. Here you can view and manage teams as an
        admin."
    >
      <TeamsAdminPanel />
    </AdminPageLayout>
  ),
})
