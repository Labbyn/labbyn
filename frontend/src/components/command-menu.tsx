import {
  Activity,
  Database,
  FileText,
  Loader2,
  Search,
  Server,
  User,
} from 'lucide-react'
import React, { useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { SidebarMenuButton, SidebarMenuItem } from './ui/sidebar'
import { Button } from './ui/button'
import type { Device } from '@/types/types'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import {
  documents as mockDocs,
  labs as mockLabs,
  users as mockUsers,
} from '@/lib/mock-data'

// Symulacja pobierania wszystkich danych potrzebnych do wyszukiwarki
// W prawdziwej aplikacji byłby to np. endpoint /api/search-index
const fetchGlobalSearchData = async () => {
  await new Promise((resolve) => setTimeout(resolve, 300))
  return {
    labs: mockLabs,
    users: mockUsers,
    docs: mockDocs,
  }
}

export function CommandMenu() {
  const [open, setOpen] = React.useState(false)
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['global-search'],
    queryFn: fetchGlobalSearchData,
  })

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === 'j' && (e.metaKey || e.ctrlKey)) || e.key === '/') {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  const flattenedDevices = useMemo(() => {
    if (!data?.labs) return []
    const devs: Array<Device> = []
    data.labs.forEach((lab) => {
      lab.racks.forEach((rack) => {
        rack.devices.forEach((device) => {
          devs.push({
            ...device,
            location: `${lab.name} > ${rack.id}`,
          })
        })
      })
    })
    return devs
  }, [data?.labs])

  const runCommand = React.useCallback((command: () => unknown) => {
    setOpen(false)
    command()
  }, [])

  return (
    <>
      <SidebarMenuItem key={'search'}>
        <SidebarMenuButton asChild onClick={() => setOpen(true)}>
          <Button
            variant={'outline'}
            className="text-foreground dark:bg-card hover:bg-accent hover:border-primary relative h-8 w-full justify-start pl-3 font-normal shadow-none"
          >
            <Search />
            <span>Search...</span>
          </Button>
        </SidebarMenuButton>
      </SidebarMenuItem>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search users, docs, or devices (e.g. '10.1.1' or 'GPU')..." />
        <CommandList>
          {isLoading ? (
            <div className="py-6 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading index...
            </div>
          ) : (
            <>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup heading="Infrastructure & Devices">
                {flattenedDevices.map((device) => (
                  <CommandItem
                    key={device.device_id}
                    // Massive value string enables fuzzy search on IP, MAC, Type, Hostname
                    value={`${device.hostname} ${device.ip_address} ${device.device_type} ${device.location} ${device.mac_address}`}
                    onSelect={() =>
                      runCommand(() =>
                        navigate({
                          to: `/inventory/device/${device.device_id}`,
                        }),
                      )
                    }
                  >
                    {device.device_type.includes('Switch') ? (
                      <Activity className="mr-2 h-4 w-4 text-green-500" />
                    ) : device.device_type.includes('Storage') ? (
                      <Database className="mr-2 h-4 w-4 text-purple-500" />
                    ) : (
                      <Server className="mr-2 h-4 w-4 text-slate-500" />
                    )}

                    <div className="flex w-full flex-col gap-0.5">
                      <div className="flex items-center justify-between">
                        <span>{device.hostname}</span>
                        <span className="text-xs font-mono text-muted-foreground">
                          {device.ip_address}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span className="truncate max-w-37.5">
                          {device.location}
                        </span>
                        <span className="border-l pl-2">
                          {device.device_type}
                        </span>
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>

              <CommandSeparator />

              <CommandGroup heading="Documentation">
                {data?.docs.map((doc) => (
                  <CommandItem
                    key={doc.id}
                    value={`${doc.name} ${doc.type}`}
                    onSelect={() =>
                      runCommand(() => navigate({ to: `/docs/${doc.id}` }))
                    }
                  >
                    <FileText className="mr-2 h-4 w-4 text-orange-500" />
                    <span>{doc.name}</span>
                    <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {doc.type}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>

              <CommandSeparator />

              <CommandGroup heading="Team">
                {data?.users.map((user) => (
                  <CommandItem
                    key={user.id}
                    value={`${user.name} ${user.surname} ${user.role} ${user.team}`}
                    onSelect={() =>
                      runCommand(() => navigate({ to: `/users/${user.id}` }))
                    }
                  >
                    <User className="mr-2 h-4 w-4 text-blue-500" />
                    <div className="flex flex-col">
                      <span>
                        {user.name} {user.surname}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {user.role}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  )
}
