import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { AppSidebar } from '@/components/app-sidebar'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'

export const Route = createFileRoute('/_auth')({
  beforeLoad: ({ context, location }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({
        to: '/login',
        search: {
          redirect: location.href,
        },
      })
    }

    if (context.auth.user?.force_password_change) {
      throw redirect({
        to: '/setup-password',
      })
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="overflow-hidden flex flex-col">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4 md:hidden bg-background">
          <SidebarTrigger />
          <span className="font-semibold">Labbyn</span>
        </header>
        <div className="flex-1 overflow-hidden relative">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
