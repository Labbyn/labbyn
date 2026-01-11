import { createFileRoute } from '@tanstack/react-router'
import { PageNotFound } from '@/components/page-not-found'

export const Route = createFileRoute('/_auth/admin')({
  component: RouteComponent,
})

function RouteComponent() {
  return <PageNotFound />
}
