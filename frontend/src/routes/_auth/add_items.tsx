import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/add_items')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_auth/add_items"!</div>
}
