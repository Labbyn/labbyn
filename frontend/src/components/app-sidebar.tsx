import {
  Archive,
  Box,
  ChevronDown,
  ChevronsUpDown,
  CirclePile,
  Component,
  FileText,
  FolderInput,
  HardDrive,
  History,
  LayoutGrid,
  LogOut,
  MapPin,
  Moon,
  PanelsTopLeft,
  Server,
  Sun,
  Tags,
  User,
  Users,
  Zap,
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
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { HoverCard, HoverCardContent, HoverCardTrigger } from './ui/hover-card'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { AddPlatformDialog } from './add-platform-dialog'
import { AddTagDialog } from './add-tag-dialog'
import { AddRackDialog } from './add-rack-dialog'
import { AddCategoriesDialog } from './add-categories-dialog'
import { AddRoomsDialog } from './add-rooms-dialog'
import { AddInventoryDialog } from './add-inventory-dialog'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './ui/collapsible'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { useAuth } from '@/routes/auth'

const QUICK_ACTIONS = [
  {
    id: 'platform',
    label: 'New Platform',
    desc: 'Register a new machine',
    icon: Box,
    Component: AddPlatformDialog,
  },
  {
    id: 'tag',
    label: 'Create Tag',
    desc: 'Add new organizational labels',
    icon: Tags,
    Component: AddTagDialog,
  },
  {
    id: 'rack',
    label: 'Add Rack',
    desc: 'Define a new server rack',
    icon: Server,
    Component: AddRackDialog,
  },
  {
    id: 'category',
    label: 'New Category',
    desc: 'Group your inventory logically',
    icon: LayoutGrid,
    Component: AddCategoriesDialog,
  },
  {
    id: 'rooms',
    label: 'Add Room',
    desc: 'Add physical locations',
    icon: MapPin,
    Component: AddRoomsDialog,
  },
  {
    id: 'inventory',
    label: 'Add Inventory',
    desc: 'Record a new device or part',
    icon: Component,
    Component: AddInventoryDialog,
  },
]

const items = [
  { title: 'Dashboard', url: '/user-dashboard', icon: PanelsTopLeft },
  { title: 'Labs', url: '/labs', icon: Server },
  { title: 'Inventory', url: '/inventory', icon: Archive },
  { title: 'Machines', url: '/machines', icon: HardDrive },
  { title: 'History', url: '/history', icon: History },
  { title: 'Users', url: '/users', icon: User },
  { title: 'Teams', url: '/teams', icon: Users },
  { title: 'Documentation', url: '/documentation', icon: FileText },
  { title: 'Import & Export', url: '/import-export', icon: FolderInput },
]

const adminPanelItems = [
  { title: 'Users', url: '/admin-panel/users', icon: User },
  { title: 'Teams', url: '/admin-panel/teams', icon: CirclePile },
  { title: 'Tags', url: '/admin-panel/tags', icon: Tags },
  { title: 'Categories', url: '/admin-panel/categories', icon: LayoutGrid },
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
          <SidebarMenuItem>
            <div className="sr-only">
              {QUICK_ACTIONS.map((action) => (
                <action.Component key={`hidden-dialog-${action.id}`}>
                  <button
                    id={`trigger-${action.id}`}
                    type="button"
                    aria-hidden="true"
                    tabIndex={-1}
                  />
                </action.Component>
              ))}
            </div>

            <HoverCard openDelay={100} closeDelay={150}>
              <HoverCardTrigger asChild>
                <SidebarMenuButton
                  className="group text-primary transition-all"
                  tooltip="Quick Actions"
                >
                  <Zap className="text-primary fill-primary/20 group-hover:scale-110 transition-transform" />
                  <span className="font-medium">Quick Actions</span>
                </SidebarMenuButton>
              </HoverCardTrigger>

              <HoverCardContent
                side={isMobile ? 'bottom' : 'right'}
                align="start"
                sideOffset={16}
                className="w-130 p-4 shadow-xl border-border/50 backdrop-blur-sm bg-card/60"
              >
                <div className="mb-4 space-y-1">
                  <h4 className="text-sm font-semibold leading-none tracking-tight">
                    Quick Actions
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Instantly add new resources to your lab environment.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {QUICK_ACTIONS.map((action) => (
                    <div key={action.id} className="relative">
                      <Button
                        variant="ghost"
                        onClick={() =>
                          document
                            .getElementById(`trigger-${action.id}`)
                            ?.click()
                        }
                        className="flex items-start justify-start gap-3 p-3 w-full h-full text-left whitespace-normal hover:bg-primary/10 border border-transparent hover:border-border/50"
                      >
                        <div className="mt-0.5 bg-muted/50 p-1.5 rounded-md shadow-sm border border-border/50 shrink-0">
                          <action.icon className="size-4 text-primary" />
                        </div>
                        <div className="flex flex-col space-y-1">
                          <span className="text-sm font-medium leading-none">
                            {action.label}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {action.desc}
                          </span>
                        </div>
                      </Button>
                    </div>
                  ))}
                </div>
              </HoverCardContent>
            </HoverCard>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
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
                <DropdownMenuItem asChild>
                  <Link
                    to="/users/$userId"
                    params={{ userId: String(user.id) }}
                  >
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
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

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
