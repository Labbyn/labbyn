import { createFileRoute } from '@tanstack/react-router'
import { Users } from 'lucide-react'
import UserAdminPanel from '@/components/admin-panel/users-admin-panel'

import { AdminPageLayout } from '@/components/admin-panel/admin-page-layout'

export const Route = createFileRoute('/_auth/admin-panel/users')({
  component: () => (
    <AdminPageLayout
      icon={<Users />}
      title="Welcome to Users admin panel. Here you can view and manage inventory as an admin."
    >
      <UserAdminPanel />
    </AdminPageLayout>
  ),
})
