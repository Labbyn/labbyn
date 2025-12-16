import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowRight, Map, Server, User } from 'lucide-react'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'

export const Route = createFileRoute('/labs')({
  component: RouteComponent,
})

const data = [
  {
    name: 'Quantum Computing Lab',
    tags: ['Quantum', 'Experimental', 'High-Security'],
    racks: [
      {
        id: 'QC-RACK-01',
        tags: ['Control', 'QPU-Interface', 'Core'],
        devices: [
          {
            device_id: 'QC-SVR-001',
            hostname: 'qctrl-master-01',
            device_type: 'Control Server',
            ip_address: '10.1.1.10',
            mac_address: '0A:1B:2C:3D:4E:01',
            status: 'Online',
          },
          {
            device_id: 'QC-NET-001',
            hostname: 'qclab-switch-01',
            device_type: 'Network Switch',
            ip_address: '10.1.1.1',
            mac_address: '0A:1B:2C:3D:4E:02',
            status: 'Online',
          },
        ],
      },
      {
        id: 'QC-RACK-02',
        tags: ['Storage', 'Simulation', 'Compute'],
        devices: [
          {
            device_id: 'QC-STO-001',
            hostname: 'qdata-storage-01',
            device_type: 'Storage Array',
            ip_address: '10.1.1.50',
            mac_address: '0A:1B:2C:3D:4E:10',
            status: 'Online',
          },
          {
            device_id: 'QC-SVR-002',
            hostname: 'qsim-node-01',
            device_type: 'Simulation Server',
            ip_address: '10.1.1.20',
            mac_address: '0A:1B:2C:3D:4E:11',
            status: 'Online',
          },
        ],
      },
      {
        id: 'QC-RACK-03',
        tags: ['Simulation', 'Compute', 'PDU-A'],
        devices: [
          {
            device_id: 'QC-SVR-003',
            hostname: 'qsim-node-02',
            device_type: 'Simulation Server',
            ip_address: '10.1.1.21',
            mac_address: '0A:1B:2C:3D:4E:12',
            status: 'Online',
          },
          {
            device_id: 'QC-PDU-001',
            hostname: 'qpdu-01a',
            device_type: 'PDU',
            ip_address: '10.1.1.250',
            mac_address: '0A:1B:2C:3D:4E:F0',
            status: 'Online',
          },
        ],
      },
      {
        id: 'QC-RACK-01',
        tags: ['Control', 'QPU-Interface', 'Core'],
        devices: [
          {
            device_id: 'QC-SVR-001',
            hostname: 'qctrl-master-01',
            device_type: 'Control Server',
            ip_address: '10.1.1.10',
            mac_address: '0A:1B:2C:3D:4E:01',
            status: 'Online',
          },
          {
            device_id: 'QC-NET-001',
            hostname: 'qclab-switch-01',
            device_type: 'Network Switch',
            ip_address: '10.1.1.1',
            mac_address: '0A:1B:2C:3D:4E:02',
            status: 'Online',
          },
        ],
      },
      {
        id: 'QC-RACK-02',
        tags: ['Storage', 'Simulation', 'Compute'],
        devices: [
          {
            device_id: 'QC-STO-001',
            hostname: 'qdata-storage-01',
            device_type: 'Storage Array',
            ip_address: '10.1.1.50',
            mac_address: '0A:1B:2C:3D:4E:10',
            status: 'Online',
          },
          {
            device_id: 'QC-SVR-002',
            hostname: 'qsim-node-01',
            device_type: 'Simulation Server',
            ip_address: '10.1.1.20',
            mac_address: '0A:1B:2C:3D:4E:11',
            status: 'Online',
          },
        ],
      },
      {
        id: 'QC-RACK-03',
        tags: ['Simulation', 'Compute', 'PDU-A'],
        devices: [
          {
            device_id: 'QC-SVR-003',
            hostname: 'qsim-node-02',
            device_type: 'Simulation Server',
            ip_address: '10.1.1.21',
            mac_address: '0A:1B:2C:3D:4E:12',
            status: 'Online',
          },
          {
            device_id: 'QC-PDU-001',
            hostname: 'qpdu-01a',
            device_type: 'PDU',
            ip_address: '10.1.1.250',
            mac_address: '0A:1B:2C:3D:4E:F0',
            status: 'Online',
          },
        ],
      },
    ],
  },
  {
    name: 'AI Research Facility',
    tags: ['AI/ML', 'HPC', 'GPU'],
    racks: [
      {
        id: 'AI-RACK-A1',
        tags: ['GPU-Cluster', 'Training', 'Compute-A1'],
        devices: [
          {
            device_id: 'AI-GPU-001',
            hostname: 'gpu-cluster-node-01',
            device_type: 'GPU Server',
            ip_address: '10.2.1.10',
            mac_address: 'F1:E2:D3:C4:B5:A0',
            status: 'Processing',
          },
          {
            device_id: 'AI-GPU-002',
            hostname: 'gpu-cluster-node-02',
            device_type: 'GPU Server',
            ip_address: '10.2.1.11',
            mac_address: 'F1:E2:D3:C4:B5:A1',
            status: 'Processing',
          },
          {
            device_id: 'AI-GPU-003',
            hostname: 'gpu-cluster-node-03',
            device_type: 'GPU Server',
            ip_address: '10.2.1.12',
            mac_address: 'F1:E2:D3:C4:B5:A2',
            status: 'Idle',
          },
          {
            device_id: 'AI-NET-001',
            hostname: 'ai-core-switch-01',
            device_type: 'Network Switch',
            ip_address: '10.2.1.1',
            mac_address: 'F1:E2:D3:C4:B5:A3',
            status: 'Online',
          },
        ],
      },
      {
        id: 'AI-RACK-A2',
        tags: ['GPU-Cluster', 'Storage-NVMe', 'Compute-A2'],
        devices: [
          {
            device_id: 'AI-GPU-004',
            hostname: 'gpu-cluster-node-04',
            device_type: 'GPU Server',
            ip_address: '10.2.1.13',
            mac_address: 'F1:E2:D3:C4:B5:A4',
            status: 'Processing',
          },
          {
            device_id: 'AI-STO-001',
            hostname: 'ai-fast-storage-01',
            device_type: 'NVMe Storage',
            ip_address: '10.2.1.100',
            mac_address: 'F1:E2:D3:C4:B5:A5',
            status: 'Online',
          },
        ],
      },
      {
        id: 'AI-RACK-B1',
        tags: ['GPU-Cluster', 'Training', 'Compute-B1'],
        devices: [
          {
            device_id: 'AI-GPU-005',
            hostname: 'gpu-cluster-node-05',
            device_type: 'GPU Server',
            ip_address: '10.2.1.14',
            mac_address: 'F1:E2:D3:C4:B5:A6',
            status: 'Idle',
          },
          {
            device_id: 'AI-GPU-006',
            hostname: 'gpu-cluster-node-06',
            device_type: 'GPU Server',
            ip_address: '10.2.1.15',
            mac_address: 'F1:E2:D3:C4:B5:A7',
            status: 'Offline',
          },
          {
            device_id: 'AI-NET-002',
            hostname: 'ai-leaf-switch-01',
            device_type: 'Network Switch',
            ip_address: '10.2.1.2',
            mac_address: 'F1:E2:D3:C4:B5:A8',
            status: 'Online',
          },
        ],
      },
    ],
  },
  {
    name: 'Networking Testbed',
    tags: ['Networking', 'Testbed', 'Development'],
    racks: [
      {
        id: 'NET-RACK-01',
        tags: ['Core-Routing', 'Firewall', 'Edge'],
        devices: [
          {
            device_id: 'NET-RTR-001',
            hostname: 'core-router-01',
            device_type: 'Router',
            ip_address: '192.168.0.1',
            mac_address: 'C0:FF:EE:00:00:01',
            status: 'Offline',
          },
          {
            device_id: 'NET-FW-001',
            hostname: 'lab-firewall-01',
            device_type: 'Firewall',
            ip_address: '192.168.0.2',
            mac_address: 'C0:FF:EE:00:00:02',
            status: 'Online',
          },
        ],
      },
      {
        id: 'NET-RACK-02',
        tags: ['Access-Layer', 'Test-Clients', 'Traffic-Gen'],
        devices: [
          {
            device_id: 'NET-SW-001',
            hostname: 'testbed-switch-01',
            device_type: 'Switch',
            ip_address: '192.168.0.10',
            mac_address: 'C0:FF:EE:00:00:10',
            status: 'Online',
          },
          {
            device_id: 'NET-SVR-001',
            hostname: 'traffic-gen-01',
            device_type: 'Server',
            ip_address: '192.168.0.11',
            mac_address: 'C0:FF:EE:00:00:11',
            status: 'Online',
          },
          {
            device_id: 'NET-SVR-002',
            hostname: 'traffic-gen-02',
            device_type: 'Server',
            ip_address: '192.168.0.12',
            mac_address: 'C0:FF:EE:00:00:12',
            status: 'Online',
          },
        ],
      },
      {
        id: 'NET-RACK-03',
        tags: ['Access-Layer', 'Analytics'],
        devices: [
          {
            device_id: 'NET-SW-002',
            hostname: 'testbed-switch-02',
            device_type: 'Switch',
            ip_address: '192.168.0.13',
            mac_address: 'C0:FF:EE:00:00:13',
            status: 'Online',
          },
          {
            device_id: 'NET-SVR-003',
            hostname: 'packet-analyzer-01',
            device_type: 'Server',
            ip_address: '192.168.0.14',
            mac_address: 'C0:FF:EE:00:00:14',
            status: 'Online',
          },
        ],
      },
    ],
  },
  {
    name: 'Biotech Sequencing Lab',
    tags: ['Genomics', 'Biotech', 'Analysis'],
    racks: [
      {
        id: 'BIO-RACK-01',
        tags: ['Sequencing', 'Instrumentation', 'Core'],
        devices: [
          {
            device_id: 'BIO-SEQ-001',
            hostname: 'sequencer-alpha',
            device_type: 'Sequencer',
            ip_address: '10.3.1.10',
            mac_address: 'B1:00:00:11:22:01',
            status: 'Running',
          },
          {
            device_id: 'BIO-SEQ-002',
            hostname: 'sequencer-beta',
            device_type: 'Sequencer',
            ip_address: '10.3.1.11',
            mac_address: 'B1:00:00:11:22:02',
            status: 'Idle',
          },
          {
            device_id: 'BIO-NET-001',
            hostname: 'biolab-switch-01',
            device_type: 'Network Switch',
            ip_address: '10.3.1.1',
            mac_address: 'B1:00:00:11:22:03',
            status: 'Online',
          },
        ],
      },
      {
        id: 'BIO-RACK-02',
        tags: ['Storage', 'Analysis-Cluster', 'Compute'],
        devices: [
          {
            device_id: 'BIO-STO-001',
            hostname: 'seq-storage-main-01',
            device_type: 'Storage Array',
            ip_address: '10.3.1.50',
            mac_address: 'B1:00:00:11:22:10',
            status: 'Online',
          },
          {
            device_id: 'BIO-SVR-001',
            hostname: 'bio-analysis-01',
            device_type: 'Analysis Server',
            ip_address: '10.3.1.20',
            mac_address: 'B1:00:00:11:22:11',
            status: 'Processing',
          },
          {
            device_id: 'BIO-SVR-002',
            hostname: 'bio-analysis-02',
            device_type: 'Analysis Server',
            ip_address: '10.3.1.21',
            mac_address: 'B1:00:00:11:22:12',
            status: 'Idle',
          },
        ],
      },
    ],
  },
  {
    name: 'Robotics Lab',
    tags: ['Robotics', 'CV', 'Control-Systems'],
    racks: [
      {
        id: 'ROBO-RACK-01',
        tags: ['Control', 'Core-Network'],
        devices: [
          {
            device_id: 'RBO-SVR-001',
            hostname: 'robo-control-01',
            device_type: 'Control Server',
            ip_address: '10.4.1.10',
            mac_address: 'R0:B0:01:01:01:01',
            status: 'Online',
          },
          {
            device_id: 'RBO-NET-001',
            hostname: 'robolab-switch-01',
            device_type: 'Network Switch',
            ip_address: '10.4.1.1',
            mac_address: 'R0:B0:01:01:01:02',
            status: 'Online',
          },
        ],
      },
    ],
  },
  {
    name: 'Simulation Hub',
    tags: ['HPC', 'Simulation', 'Compute'],
    racks: [
      {
        id: 'SIM-RACK-01',
        tags: ['Compute-Nodes', 'Infiniband', 'Cluster-A'],
        devices: [
          {
            device_id: 'SIM-SVR-001',
            hostname: 'hpc-node-01',
            device_type: 'HPC Server',
            ip_address: '10.5.1.10',
            mac_address: 'S1:M0:00:AA:BB:01',
            status: 'Running',
          },
          {
            device_id: 'SIM-SVR-002',
            hostname: 'hpc-node-02',
            device_type: 'HPC Server',
            ip_address: '10.5.1.11',
            mac_address: 'S1:M0:00:AA:BB:02',
            status: 'Running',
          },
          {
            device_id: 'SIM-SVR-003',
            hostname: 'hpc-node-03',
            device_type: 'HPC Server',
            ip_address: '10.5.1.12',
            mac_address: 'S1:M0:00:AA:BB:03',
            status: 'Idle',
          },
          {
            device_id: 'SIM-NET-001',
            hostname: 'infiniband-switch-01',
            device_type: 'Infiniband Switch',
            ip_address: '10.5.1.1',
            mac_address: 'S1:M0:00:AA:BB:04',
            status: 'Online',
          },
        ],
      },
      {
        id: 'SIM-RACK-02',
        tags: ['Storage-Lustre', 'Management', 'Head-Nodes'],
        devices: [
          {
            device_id: 'SIM-STO-001',
            hostname: 'hpc-lustre-01',
            device_type: 'Lustre Storage',
            ip_address: '10.5.1.100',
            mac_address: 'S1:M0:00:AA:BB:10',
            status: 'Online',
          },
          {
            device_id: 'SIM-SVR-004',
            hostname: 'hpc-head-node-01',
            device_type: 'Management Server',
            ip_address: '10.5.1.200',
            mac_address: 'S1:M0:00:AA:BB:11',
            status: 'Online',
          },
        ],
      },
    ],
  },
]

function RouteComponent() {
  return (
    <ScrollArea className="h-screen w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 p-6 w-full">
        {data.map((lab) => (
          <Card>
            <CardHeader>
              <div className="space-y-1">
                <CardTitle className="text-xl font-bold text-primary">
                  {lab.name}
                </CardTitle>
                <CardDescription className="flex items-center gap-1.5 text-xs">
                  <User className="h-3 w-3" />
                  Owner:{' '}
                  <span className="font-medium text-foreground">
                    "Adrian K."
                  </span>
                </CardDescription>
              </div>
              <CardAction>
                <Badge variant="outline">{lab.racks.length} Racks</Badge>
              </CardAction>
            </CardHeader>
            <CardContent className="p-0">
              <div className="flex items-center gap-2 mb-3 pb-3 px-6">
                <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                  Recently Visited Racks
                </span>
                <div className="h-px bg-border flex-1" />
              </div>
              <ScrollArea className="w-full">
                <div className="flex w-max space-x-3 px-6 pb-4">
                  {lab.racks.map((rack) => (
                    <Link to={'/map'}>
                      <div className="group relative flex flex-col justify-between w-40 h-[100px] p-3 rounded-lg border bg-muted/30 hover:bg-primary/5 hover:border-primary/50 transition-all cursor-pointer">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-muted-foreground group-hover:text-primary transition-colors">
                            <Server className="h-4 w-4" />
                            <span className="text-xs font-medium">Rack ID</span>
                          </div>
                          <p className="font-mono text-sm font-bold truncate">
                            {rack.id}
                          </p>
                        </div>
                        <div className="flex justify-between items-center mt-auto pt-2">
                          <span className="text-[10px] text-muted-foreground">
                            {rack.devices.length} Devices
                          </span>
                          <ArrowRight className="h-3 w-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary" />
                        </div>
                      </div>
                    </Link>
                  ))}
                  {lab.racks.length === 0 && (
                    <div className="flex items-center justify-center w-[160px] h-[100px] text-xs text-muted-foreground border border-dashed rounded-lg">
                      No racks found
                    </div>
                  )}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </CardContent>

            <CardFooter>
              <Button asChild className="w-full">
                <Link to="/map">
                  <Map className="mr-2 h-4 w-4" />
                  View on Map
                  <ArrowRight className="ml-auto h-4 w-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </ScrollArea>
  )
}
