import { createFileRoute } from '@tanstack/react-router'
import { Archive } from 'lucide-react'
import InventoryAdminPanel from '@/components/admin-panel/inventory-admin-panel'
import { PageHeader } from '@/components/page-header'

export const Route = createFileRoute('/_auth/admin-panel/inventory')({
  component: () => (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Inventory Admin Panel"
        description="Welcome to Inventory admin panel. Here you can view and manage inventory as an admin."
        icon={Archive}
      />
      <InventoryAdminPanel />
    </div>
  ),
})
