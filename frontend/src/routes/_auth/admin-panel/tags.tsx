import { createFileRoute } from '@tanstack/react-router'
import { Tags } from 'lucide-react'
import TagsAdminPanel from '@/components/admin-panel/tags-admin-panel'
import { PageHeader } from '@/components/page-header'

export const Route = createFileRoute('/_auth/admin-panel/tags')({
  component: () => (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Tags Admin Panel"
        description="Manage tags used across the application. Create, edit, or delete tags."
        icon={Tags}
      />
      <TagsAdminPanel />
    </div>
  ),
})
