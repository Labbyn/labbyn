import { useState } from 'react'
import { createFileRoute, useRouter, Link } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { 
  Server, ArrowLeft, Brackets, MapPin, MonitorCog, Network, 
  ArrowDownUp, Cpu, MemoryStick, Save, StickyNote, Edit2, X, Check, Activity ,Book, IdCard, Cable, DatabaseBackup, LayoutGrid, GitFork, AlarmClock, Cctv, Lock, LockOpen  
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { machineSpecQueryOptions } from '@/integrations/machines/machines.query'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { TextField } from '@/components/text-filed'
import { infrastructureData } from '@/lib/mock-data'

export const Route = createFileRoute('/_auth/machines/$machineId')({
  component: MachineDetailsPage,
})

function MachineDetailsPage() {
  const router = useRouter()
  const { machineId } = Route.useParams()
  const { data: machine } = useSuspenseQuery(machineSpecQueryOptions(machineId))

  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({ ...machine })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSave = () => {
    console.log('Saving machine data:', formData)
    setIsEditing(false)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/*Header*/}
      <div className="flex items-center gap-4 border-b bg-background/95 px-6 py-4 backdrop-blur sticky top-0 z-10">
        <Button onClick={() => router.history.back()} variant="ghost" size="icon">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {isEditing ? (
              <Input 
                name="name" 
                value={formData.name} 
                onChange={handleInputChange} 
                className="h-8" 
              />
            ) : (
              <h1 className="text-xl font-bold tracking-tight">{machine.name}</h1>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
              <Edit2 className="mr-2 h-4 w-4" /> Edit
            </Button>
          ) : (
            <>
              <Button onClick={() => {
                setFormData({ ...machine });
                setIsEditing(false)}
                } variant="ghost" size="sm">
                <X className="mr-2 h-4 w-4" /> Cancel
              </Button>
              <Button onClick={handleSave} variant="default" size="sm">
                <Check className="mr-2 h-4 w-4" /> Save
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto grid gap-6 md:grid-cols-3">
          
          {/*System Information*/}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-muted-foreground" />
                System Information
              </CardTitle>
              <CardDescription>Core network and hardware configurations</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 sm:grid-cols-2 border-t pt-6">
              {[
                { label: 'IP Address', name: 'ip_address', icon: Network},
                { label: 'MAC Address', name: 'mac_address', icon: ArrowDownUp },
                { label: 'Operating System', name: 'os', icon: MonitorCog },
                { label: 'CPU', name: 'cpu', icon: Cpu },
                { label: 'RAM Memory', name: 'ram', icon: MemoryStick },
                { label: 'Storage', name: 'disk', icon: Save },
              ].map((field) => {
                const isCapacityField = field.name === 'ram' || field.name === 'disk';
                const rawValue = (machine as any)[field.name];

                const displayValue = isCapacityField && rawValue && !String(rawValue).includes('GB') 
                  ? `${rawValue} GB` 
                    : rawValue;
                return (
                <div key={field.name} className="grid gap-2">
                  <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <field.icon className="h-5 w-5" /> {field.label}
                  </span>
                  {isEditing ? (
                    <Input 
                      name={field.name}
                      value={(formData as any)[field.name]}
                      onChange={handleInputChange}
                      className="h-8"
                    />
                  ) : (
                    <span className="font-medium">
                      {displayValue}
                    </span>
                  )}
                </div>
                );
            })}
            </CardContent>
          </Card>

          {/*Localization*/}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                Localization
              </CardTitle>
              <CardDescription>Rack and environment placement</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 border-t pt-6">
              <div className="flex flex-col gap-2 border-b pb-3">
                <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">Location ID</span>
                {isEditing ? (
                  <Input name="localization_id" value={formData.localization_id} onChange={handleInputChange} className="h-8" />
                ) : (
                  <span className="font-medium">{machine.localization_id}</span>
                )}
              </div>
              <div className="flex flex-col gap-2 border-b pb-3">
                <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">Rack / Layout ID</span>
                {isEditing ? (
                  <Input name="layout_id" value={formData.layout_id} onChange={handleInputChange} className="h-8" />
                ) : (
                  <span className="font-medium">
                    {machine.layout_id}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-2 border-b pb-3">
                <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">Team ID</span>
                {isEditing ? (
                  <Input name="team_id" value={formData.team_id} onChange={handleInputChange} className="h-8" />
                ) : (
                  <span className="font-medium">
                    {machine.team_id}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Note */}
          <Card className="md:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <StickyNote className="h-5 w-5" />
                Machine Notes
              </CardTitle>
              <CardDescription>
                Useful information about machine added by team member
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <TextField 
                  value={formData.note} 
                  onChange={handleInputChange} 
                  maxChars={500}
                />   
              ) : (
                <div className="text-sm leading-relaxed">
                  {machine.note || <span className="italic opacity-50">No notes available.</span>}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Other */}
            <Card className="md:col-span-3">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Book className="h-5 w-5 text-muted-foreground" />
                  Other
                </CardTitle>
                <CardDescription>All remaining information about this machine</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6 sm:grid-cols-3 border-t pt-6">
              {[
                { label: 'ID', name: 'id', icon: IdCard },
                { label: 'PDU Port', name: 'pdu_port', icon: Cable},
                { label: 'Metadata ID', name: 'metadata_id', icon: DatabaseBackup },
                { label: 'Layout ID', name: 'layout_id', icon: LayoutGrid },
                { label: 'Version ID', name: 'version_id', icon: GitFork },
                { label: 'Added On', name: 'added_on', icon: AlarmClock },
                { label: 'Monitoring', name: 'monitoring', icon: Cctv },
                { label: 'Ansible access', name: 'ansible_access', icon: Lock },
                { label: 'Ansible root access', name: 'ansible_root_access', icon: LockOpen },
              ].map((field) => {
                const isDateField = field.name === 'added_on';
                const rawValue = (machine as any)[field.name];
                
                const displayValue = isDateField && rawValue 
                  ? new Date(rawValue).toLocaleString('en-CA', { hour12: false })
                    : rawValue;
                return (
                <div key={field.name} className="grid gap-2">
                  <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <field.icon className="h-5 w-5" /> {field.label}
                  </span>
                  {isEditing ? (
                    <Input 
                      name={field.name}
                      value={(formData as any)[field.name]}
                      onChange={handleInputChange}
                      className="h-8"
                    />
                  ) : (
                    <span className='font-medium'>
                      {displayValue}
                    </span>
                  )}
                </div>
                );
            })}
            </CardContent>
            </Card>
                
            {/* Links */}
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Book className="h-5 w-5 text-muted-foreground" />
                  Links
                </CardTitle>
                <CardDescription>Machine links</CardDescription>
              </CardHeader>
              <CardContent className="border-t pt-6">
                <div className="flex flex-col gap-2 border-b pb-3">
                  <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">Grafana link</span>
                  <Link>Placeholder</Link>
                </div>
                <div className="flex flex-col gap-2 border-b pb-3">
                  <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">Rack link</span>
                  <Link>placeholder</Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}