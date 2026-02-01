import { createFileRoute } from '@tanstack/react-router'
import { PageWorkInProgress } from '@/components/page-wip'

export const Route = createFileRoute('/_auth/import-export')({
  component: RouteComponent,
})

function RouteComponent() {
  return <PageWorkInProgress />
}
