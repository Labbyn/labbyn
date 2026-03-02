import { createFileRoute } from '@tanstack/react-router'
import { Users } from 'lucide-react'
import UserAdminPanel from '@/components/admin-panel/users-admin-panel'

import { PageHeader } from '@/components/page-header'

export const Route = createFileRoute('/_auth/admin-panel/users')({
  component: () => (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Users Admin Panel"
        description="Welcome to Users admin panel. Here you can view and manage inventory as an admin."
        icon={Users}
      />
      <UserAdminPanel />
    </div>
  ),
})
