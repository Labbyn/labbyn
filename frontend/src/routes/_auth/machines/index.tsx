import { createFileRoute } from '@tanstack/react-router'
import { Server } from 'lucide-react'
import MachinesAdminPanel from '@/components/machines-panel'
import { PageHeader } from '@/components/page-header'

export const Route = createFileRoute('/_auth/machines/')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Machines"
        description="Manage and monitor your lab infrastructure"
        icon={Server}
      />
      <MachinesAdminPanel />
    </div>
  )
}
