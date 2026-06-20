import { createFileRoute } from '@tanstack/react-router'
import { LayoutGrid } from 'lucide-react'
import CategoriesAdminPanel from '@/components/admin-panel/categories-admin-panel'
import { PageHeader } from '@/components/page-header'

export const Route = createFileRoute('/_auth/admin-panel/categories')({
  component: () => (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Categories Admin Panel"
        description="Manage categories used to group inventory. Create, edit, or delete categories."
        icon={LayoutGrid}
      />
      <CategoriesAdminPanel />
    </div>
  ),
})
