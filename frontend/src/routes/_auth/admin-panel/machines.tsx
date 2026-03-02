import { createFileRoute } from '@tanstack/react-router'
import { HardDrive } from 'lucide-react'
import MachinesAdminPanel from '@/components/admin-panel/machines-admin-panel'
import { PageHeader } from '@/components/page-header'

export const Route = createFileRoute('/_auth/admin-panel/machines')({
  component: () => (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Machines Admin Panel"
        description="Welcome to Machines admin panel. Here you can view and manage machines as
        an admin."
        icon={HardDrive}
      />
      <MachinesAdminPanel />
    </div>
  ),
})
