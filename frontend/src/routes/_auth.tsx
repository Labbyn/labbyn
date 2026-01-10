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
  },
  component: RouteComponent,
})

function RouteComponent() {
  /*
  const router = useRouter()
  const navigate = Route.useNavigate()
  const auth = useAuth()
  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      auth.logout()

      //Invalidate the router to clear cached data
      router.invalidate().finally(() => {
        navigate({ to: '/' })
      })
    }
  }
  */

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
