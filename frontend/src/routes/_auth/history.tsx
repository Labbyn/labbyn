import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/history')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/history"!</div>
}
