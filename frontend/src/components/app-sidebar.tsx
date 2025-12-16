import {
  Accessibility,
  BookText,
  Cable,
  FolderInput,
  GitBranch,
  LayoutDashboard,
  Server,
  Settings,
  UserStar,
  Users,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@radix-ui/react-avatar'
import { Link, useLocation } from '@tanstack/react-router'
import { SearchForm } from './search-form'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from '@/components/ui/sidebar'

const items = [
  {
    title: 'Dashboard',
    url: '/',
    icon: LayoutDashboard,
  },
  {
    title: 'Labs',
    url: '/labs',
    icon: Server,
  },
  {
    title: 'Inventory',
    url: '/inventory',
    icon: Cable,
  },
  {
    title: 'History',
    url: '/history',
    icon: GitBranch,
  },
  {
    title: 'Users',
    url: '/users',
    icon: Users,
  },
  {
    title: 'Settings',
    url: '/settings',
    icon: Settings,
  },
  {
    title: 'Admin',
    url: '/admin',
    icon: UserStar,
  },
  {
    title: 'Documentation',
    url: '/docs',
    icon: BookText,
  },
  {
    title: 'Import & Export',
    url: '/import-export',
    icon: FolderInput,
  },
]

const user = {
  name: 'Zbigniew Trąba',
  email: 'ekspert.od.kabelkow@labbyn.com',
  avatar: 'https://cdn.pfps.gg/pfps/66456-cool-cat.jpeg',
}

export function AppSidebar() {
  const pathname = useLocation({
    select: (location) => location.pathname,
  })

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <a href="#">
                <Accessibility className="size-5!" />
                <span className="text-base font-semibold">Labbyn</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SearchForm />
              </SidebarMenuItem>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                    tooltip={item.title}
                  >
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarTrigger />
        <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
          <Avatar className="h-8 w-8 rounded-lg">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback className="rounded-lg">CN</AvatarFallback>
          </Avatar>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-medium">{user.name}</span>
            <span className="truncate text-xs">{user.email}</span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
