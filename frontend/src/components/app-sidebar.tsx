import {
  Accessibility,
  BookText,
  Cable,
  ChevronsUpDown,
  FolderInput,
  GitBranch,
  LayoutDashboard,
  LogOut,
  Moon,
  Server,
  Settings,
  Sun,
  UserStar,
  Users,
} from 'lucide-react'
import { Link, useLocation } from '@tanstack/react-router'
import React from 'react'
import { CommandMenu } from './command-menu'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { AddPlatformDialog } from './platform-dialog'
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
  useSidebar,
} from '@/components/ui/sidebar'

const items = [
  {
    title: 'Dashboard',
    url: '/user_dashboard',
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

function useTheme() {
  const [theme, setTheme] = React.useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('ui-theme') as 'light' | 'dark' | null
      if (stored) return stored

      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark'
      }
    }
    return 'light'
  })

  React.useEffect(() => {
    const root = window.document.documentElement

    root.classList.remove('light', 'dark')
    root.classList.add(theme)

    localStorage.setItem('ui-theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
  }

  return { theme, toggleTheme }
}
export function AppSidebar() {
  const pathname = useLocation({
    select: (location) => location.pathname,
  })
  const { theme, toggleTheme } = useTheme()
  const { isMobile } = useSidebar()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <Link to="/">
                <Box color="var(--primary)" className="size-5!" />
                <span className="font-['Ubuntu_Mono'] font-bold text-xl tracking-tight">
                  labbyn
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <AddPlatformDialog />
              </SidebarMenuItem>
              <SidebarMenuItem>
                <CommandMenu />
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

              <SidebarMenuItem>
                <SidebarMenuButton onClick={toggleTheme} tooltip="Toggle Theme">
                  {theme === 'dark' ? <Moon /> : <Sun />}
                  <span>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarTrigger />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="rounded-lg">ZT</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{user.name}</span>
                    <span className="truncate text-xs">{user.email}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                side={isMobile ? 'bottom' : 'right'}
                align="end"
                sideOffset={4}
              >
                <DropdownMenuItem>
                  <LogOut className="mr-2 size-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
