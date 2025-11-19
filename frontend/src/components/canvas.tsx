import { Canvas } from '@react-three/fiber'
import { useMemo } from 'react'
import { Grid, OrbitControls } from '@react-three/drei'
import { ChevronDown, ExternalLink, Pencil, Smile } from 'lucide-react'
import { Button } from './ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { ScrollArea } from './ui/scroll-area'
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './ui/card'
import { Badge } from './ui/badge'

export interface Equipment {
  id: string
  type: string
  x: number
  y: number
  label: string
}

export interface Wall {
  id: string
  x1: number
  y1: number
  x2: number
  y2: number
}

interface Canvas3DProps {
  equipment: Array<Equipment>
  walls: Array<Wall>
}

const COLORS = [
  '#e63946',
  '#f1faee',
  '#a8dadc',
  '#457b9d',
  '#1d3557',
  '#ffb703',
  '#fb8500',
  '#2a9d8f',
  '#e9c46a',
  '#264653',
]

function Equipment3D({ item }: { item: Equipment }) {
  const size = 5
  const height = 2

  const randomColor = useMemo(() => {
    const randomIndex = Math.floor(Math.random() * COLORS.length)
    return COLORS[randomIndex]
  }, [])

  return (
    <group
      position={[item.x / 10, height / 2, item.y / 10]}
      onClick={(e) => {
        e.stopPropagation()
      }}
    >
      <mesh>
        <boxGeometry args={[size, height, size]} />
        <meshStandardMaterial color={randomColor} />
      </mesh>
    </group>
  )
}

function Wall3D({ wall }: { wall: Wall }) {
  const x1 = wall.x1 / 10
  const y1 = wall.y1 / 10
  const x2 = wall.x2 / 10
  const y2 = wall.y2 / 10

  const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
  const angle = Math.atan2(y2 - y1, x2 - x1)
  const cx = (x1 + x2) / 2
  const cy = (y1 + y2) / 2

  return (
    <mesh position={[cx, 1.5, cy]} rotation={[0, angle, 0]}>
      <boxGeometry args={[length || 0.4, 3, 0.4]} />
      <meshStandardMaterial color="#ff1d8d" />
    </mesh>
  )
}

const data = [
  {
    name: 'Quantum Computing Lab',
    tags: ['Quantum'],
    racks: [
      {
        id: 'QC-RACK-01',
        tags: ['Control'],
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
          {
            device_id: 'QC-QPU-001',
            hostname: 'qpu-analyzer-01',
            device_type: 'QPU Interface',
            ip_address: '10.1.1.12',
            mac_address: '0A:1B:2C:3D:4E:03',
            status: 'Calibrating',
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
        id: 'QC-RACK-04',
        tags: ['Control', 'Redundant', 'Infrastructure'],
        devices: [
          {
            device_id: 'QC-SVR-004',
            hostname: 'qctrl-secondary-01',
            device_type: 'Control Server',
            ip_address: '10.1.1.11',
            mac_address: '0A:1B:2C:3D:4E:04',
            status: 'Standby',
          },
          {
            device_id: 'QC-NET-002',
            hostname: 'qclab-switch-02',
            device_type: 'Network Switch',
            ip_address: '10.1.1.2',
            mac_address: '0A:1B:2C:3D:4E:05',
            status: 'Online',
          },
        ],
      },
    ],
  },
  {
    name: 'AI Research Facility',
    tags: ['AI/ML'],
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
      {
        id: 'AI-RACK-B2',
        tags: ['Storage-Bulk', 'Management'],
        devices: [
          {
            device_id: 'AI-STO-002',
            hostname: 'ai-bulk-storage-01',
            device_type: 'Storage Array',
            ip_address: '10.2.1.101',
            mac_address: 'F1:E2:D3:C4:B5:A9',
            status: 'Online',
          },
          {
            device_id: 'AI-SVR-001',
            hostname: 'ai-mgmt-server-01',
            device_type: 'Management Server',
            ip_address: '10.2.1.200',
            mac_address: 'F1:E2:D3:C4:B5:AA',
            status: 'Online',
          },
        ],
      },
    ],
  },
  {
    name: 'Networking Testbed',
    tags: ['Networking'],
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
    tags: ['Biotech'],
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
    tags: ['CV'],
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
      {
        id: 'ROBO-RACK-02',
        tags: ['Vision-Processing', 'GPU', 'Storage'],
        devices: [
          {
            device_id: 'RBO-SVR-002',
            hostname: 'robo-vision-proc-01',
            device_type: 'GPU Server',
            ip_address: '10.4.1.11',
            mac_address: 'R0:B0:01:01:01:03',
            status: 'Processing',
          },
          {
            device_id: 'RBO-STO-001',
            hostname: 'robo-storage-01',
            device_type: 'Storage Array',
            ip_address: '10.4.1.50',
            mac_address: 'R0:B0:01:01:01:04',
            status: 'Online',
          },
        ],
      },
    ],
  },
  {
    name: 'Simulation Hub',
    tags: ['HPC'],
    racks: [
      {
        id: 'SIM-RACK-01',
        tags: ['Compute-Nodes'],
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
        tags: ['Storage-Lustre'],
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

function CanvasComponent3D({ equipment, walls }: Canvas3DProps) {
  return (
    <div className="flex-1 relative">
      <Canvas camera={{ position: [400, 50, 100], fov: 50 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 20, 10]} intensity={0.8} />
        <pointLight position={[0, 10, 0]} intensity={0.4} />

        <Grid
          args={[1000, 1000]}
          cellSize={5}
          cellColor="#6b7280"
          sectionSize={20}
          sectionColor="#1f2937"
          fadeDistance={500}
          fadeStrength={0.9}
        />

        {equipment.map((item) => (
          <Equipment3D key={item.id} item={item} />
        ))}

        {walls.map((wall) => (
          <Wall3D key={wall.id} wall={wall} />
        ))}

        <OrbitControls
          autoRotate={false}
          zoomToCursor={true}
          screenSpacePanning={true}
        />
      </Canvas>

      <div className="absolute bottom-5 left-5 text-secondary bg-primary px-4 py-2 rounded-md text-sm">
        LMB to rotate, Scroll to zoom, RMB to pan
      </div>
      <div className="absolute flex top-5 left-5 text-secondary p-4 gap-4 rounded-md">
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Button>
              Networking Testbed
              <ChevronDown />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Rocket Lab</DropdownMenuItem>
            <DropdownMenuItem>Quantum tests</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Button>
              Layout 1 <ChevronDown />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Layout 2</DropdownMenuItem>
            <DropdownMenuItem>Layout 3</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button>
          Edit layout
          <Pencil />
        </Button>
      </div>
      <div className="absolute top-5 right-5 h-full ">
        <ScrollArea className="h-4/5 w-72 rounded-md">
          {data.map((lab) =>
            lab.racks.map((rack) => (
              <div className="p-1">
                <Card>
                  <CardHeader>
                    <CardTitle>{rack.id}</CardTitle>
                    <CardAction>
                      {lab.tags.map((tag) => (
                        <Badge>{tag}</Badge>
                      ))}
                    </CardAction>
                  </CardHeader>
                  <CardFooter>Devices: {rack.devices.length}</CardFooter>
                </Card>
              </div>
            )),
          )}
        </ScrollArea>
      </div>
    </div>
  )
}

export { CanvasComponent3D }
