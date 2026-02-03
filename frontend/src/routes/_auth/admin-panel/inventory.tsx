// src/routes/_auth/admin-panel/inventory.tsx
import { createFileRoute } from '@tanstack/react-router'
import { Archive } from 'lucide-react'
import { AdminPageLayout } from '@/components/admin-panel/admin-page-layout'
import InventoryAdminPanel from '@/components/admin-panel/inventory-admin-panel'

export const Route = createFileRoute('/_auth/admin-panel/inventory')({
  component: () => (
    <AdminPageLayout
      icon={<Archive />}
      title="Welcome to Inventory admin panel. Here you can view and manage inventory as an admin."
    >
      <InventoryAdminPanel />
    </AdminPageLayout>
  ),
})
