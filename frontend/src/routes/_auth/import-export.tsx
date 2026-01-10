import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/import-export')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/import-export"!</div>
}
