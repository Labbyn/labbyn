import {
  Building2,
  Calendar,
  Inbox,
  LayoutDashboard,
  Search,
  Settings,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from '@/components/ui/sidebar'

const items = [
  {
    title: 'Dashboard',
    url: '#',
    icon: LayoutDashboard,
  },
  {
    title: 'Labs',
    url: '#',
    icon: Inbox,
  },
  {
    title: 'Equipment',
    url: '#',
    icon: Inbox,
  },
  {
    title: 'History',
    url: '#',
    icon: Calendar,
  },
  {
    title: 'User Groups',
    url: '#',
    icon: Search,
  },
  {
    title: 'Settings',
    url: '#',
    icon: Settings,
  },
  {
    title: 'Monitoring',
    url: '#',
    icon: Settings,
  },
  {
    title: 'Admin tools',
    url: '#',
    icon: Settings,
  },
  {
    title: 'Documentation',
    url: '#',
    icon: Settings,
  },
]

export function AppSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="#">
                <Building2 className="!size-5" />
                <span className="text-base font-semibold">Labbyn</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Application</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarTrigger />
      </SidebarFooter>
    </Sidebar>
  )
}
