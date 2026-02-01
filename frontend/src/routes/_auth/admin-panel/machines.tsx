import { createFileRoute } from '@tanstack/react-router'
import { HardDrive } from 'lucide-react'
import { AdminPageLayout } from '@/components/admin-panel/admin-page-layout'
import MachinesAdminPanel from '@/components/admin-panel/machines-admin-panel'

export const Route = createFileRoute('/_auth/admin-panel/machines')({
  component: () => (
    <AdminPageLayout
      icon={<HardDrive />}
      title="Welcome to Machines admin panel. Here you can view and manage machines as
        an admin."
    >
      <MachinesAdminPanel />
    </AdminPageLayout>
  ),
})
