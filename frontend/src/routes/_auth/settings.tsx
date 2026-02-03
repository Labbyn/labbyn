import { createFileRoute } from '@tanstack/react-router'
import { PageWorkInProgress } from '@/components/page-wip'

export const Route = createFileRoute('/_auth/settings')({
  component: RouteComponent,
})

function RouteComponent() {
  return <PageWorkInProgress />
}
