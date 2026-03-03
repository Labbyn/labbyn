// src/components/app-sidebar.tsx
import {
  Archive,
  Box,
  ChevronDown,
  ChevronsUpDown,
  CirclePile,
  FileText,
  FolderInput,
  HardDrive,
  History,
  LogOut,
  Moon,
  PanelsTopLeft,
  ScrollText,
  Server,
  Settings,
  Sun,
  User,
  Users,
} from 'lucide-react'
import {
  Link,
  useLocation,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import React from 'react'
import { CommandMenu } from './command-menu'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { AddPlatformDialog } from './platform-dialog'
import { AddTagDialog } from './add-tag-dialog'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './ui/collapsible'
import { Badge } from './ui/badge'
import { useAuth } from '@/routes/auth' //
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from '@/components/ui/sidebar'

const items = [
  { title: 'Dashboard', url: '/user-dashboard', icon: PanelsTopLeft },
  { title: 'Labs', url: '/labs', icon: Server },
  { title: 'Inventory', url: '/inventory', icon: Archive },
  { title: 'History', url: '/history', icon: History },
  { title: 'Users', url: '/users', icon: User },
  { title: 'Teams', url: '/teams', icon: Users },
  { title: 'Documentation', url: '/docs', icon: FileText },
  { title: 'Import & Export', url: '/import-export', icon: FolderInput },
]

const adminPanelItems = [
  { title: 'Users', url: '/admin-panel/users', icon: User },
  { title: 'Teams', url: '/admin-panel/teams', icon: CirclePile },
  { title: 'Machines', url: '/admin-panel/machines', icon: HardDrive },
  { title: 'Inventory', url: '/admin-panel/inventory', icon: Archive },
  { title: 'Logging', url: '/admin-panel/logging', icon: ScrollText },
]

function useTheme() {
  const [theme, setTheme] = React.useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('ui-theme') as 'light' | 'dark' | null
      if (stored) return stored
      if (window.matchMedia('(prefers-color-scheme: dark)').matches)
        return 'dark'
    }
    return 'light'
  })

  React.useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(theme)
    localStorage.setItem('ui-theme', theme)
  }, [theme])

  const toggleTheme = () =>
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))

  return { theme, toggleTheme }
}

export function AppSidebar() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const navigate = useNavigate()
  const pathname = useLocation({ select: (location) => location.pathname })
  const { theme, toggleTheme } = useTheme()
  const { isMobile } = useSidebar()

  if (!user) return null

  const handleLogout = async () => {
    await logout()
    router.invalidate()
    navigate({ to: '/login' })
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
  }

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
          <SidebarMenuItem>
            <CommandMenu />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Quick actions</SidebarGroupLabel>
          <SidebarGroupAction>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Settings />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-fit rounded-lg"
                side={isMobile ? 'bottom' : 'right'}
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel>Configure quick actions</DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuGroup>
                  <DropdownMenuCheckboxItem checked>
                    Add platform
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem checked>
                    Add tag
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem>
                    Add inventory item
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem>
                    Add something
                  </DropdownMenuCheckboxItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarGroupAction>
          <SidebarContent>
            <SidebarMenuItem>
              <AddPlatformDialog />
              <AddTagDialog />
            </SidebarMenuItem>
          </SidebarContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Overview</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
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

        {/* ADMIN PANELS SUBMENU */}
        {user.user_type === 'admin' && (
          <Collapsible defaultOpen className="group/collapsible">
            <SidebarGroup>
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger>
                  Admin panels
                  <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <SidebarMenuSub>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    {adminPanelItems.map((item) => (
                      <SidebarMenuSubItem key={item.title}>
                        <SidebarMenuSubButton
                          asChild
                          isActive={pathname === item.url}
                        >
                          <Link to={item.url}>
                            <item.icon />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarMenuSub>
            </SidebarGroup>
          </Collapsible>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={(user as any).avatar} alt={user.name} />
                    <AvatarFallback className="rounded-lg">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {user.name}{' '}
                      {user.user_type === 'admin' && (
                        <Badge variant="secondary">Admin</Badge>
                      )}
                    </span>
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
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarFallback className="rounded-lg">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {user.name}{' '}
                      {user.user_type === 'admin' && <Badge>Admin</Badge>}
                    </span>
                    <span className="truncate text-xs">{user.email}</span>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <Link to="/settings">
                  <DropdownMenuItem>
                    <Settings />
                    <span>Settings</span>
                  </DropdownMenuItem>
                </Link>

                <DropdownMenuItem onClick={toggleTheme}>
                  {theme === 'dark' ? <Moon /> : <Sun />}
                  <span>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
                </DropdownMenuItem>

                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
