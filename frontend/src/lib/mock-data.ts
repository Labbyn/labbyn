export const docs = [
  { id: '0', name: 'Labbyn Overview', type: 'Guide' },
  { id: '102', name: 'New Technician Onboarding', type: 'Procedure' },
  { id: '103', name: 'Emergency Power Off (EPO)', type: 'Safety' },
  { id: '201', name: 'Dell R740 BIOS Update', type: 'Maintenance' },
  { id: '304', name: 'VLAN ID Registry', type: 'Network' },
  { id: '401', name: 'NetBox Naming Convention', type: 'Standard' },
]

export const infrastructureData = [
  {
    name: 'Quantum Computing Lab',
    racks: [
      {
        id: 'QC-RACK-01',
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
    ],
  },
  {
    name: 'AI Research Facility',
    racks: [
      {
        id: 'AI-RACK-A1',
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
            device_id: 'AI-STO-001',
            hostname: 'ai-fast-storage-01',
            device_type: 'NVMe Storage',
            ip_address: '10.2.1.100',
            mac_address: 'F1:E2:D3:C4:B5:A5',
            status: 'Online',
          },
        ],
      },
    ],
  },
]

export const users = [
  {
    id: 'u9x2ka',
    name: 'Evelyn',
    surname: 'Reed',
    team: 'Quantum Computing Lab',
    role: 'Lead Physicist',
  },
  {
    id: 'q7m1zp',
    name: 'Marcus',
    surname: 'Chen',
    team: 'Quantum Computing Lab',
    role: 'Cryogenics Engineer',
  },
  {
    id: 'a2k99x',
    name: 'Kenji',
    surname: 'Tanaka',
    team: 'AI Research Facility',
    role: 'Senior ML Engineer',
  },
  {
    id: 'j55qqw',
    name: 'Sarah',
    surname: 'Jennings',
    team: 'AI Research Facility',
    role: 'Data Scientist',
  },
  {
    id: 'n8t11b',
    name: 'Maria',
    surname: 'Gomez',
    team: 'Networking Testbed',
    role: 'Network Architect',
  },
  {
    id: 's77dq1',
    name: 'James',
    surname: 'Holden',
    team: 'Networking Testbed',
    role: 'SysAdmin',
  },
  {
    id: 'b10xy9',
    name: 'Alice',
    surname: 'Wong',
    team: 'Biotech Sequencing Lab',
    role: 'Computational Biologist',
  },
  {
    id: 'r4b77z',
    name: 'Robert',
    surname: 'Lang',
    team: 'Biotech Sequencing Lab',
    role: 'Lab Technician',
  },
  {
    id: 'x99mk2',
    name: 'Emily',
    surname: 'White',
    team: 'Robotics Lab',
    role: 'Robotics Engineer',
  },
  {
    id: 'v33p1q',
    name: 'Michael',
    surname: 'Brown',
    team: 'Robotics Lab',
    role: 'Computer Vision Specialist',
  },
  {
    id: 'h11c44',
    name: 'Chris',
    surname: 'Green',
    team: 'Simulation Hub',
    role: 'HPC Administrator',
  },
  {
    id: 'z88k2m',
    name: 'Patricia',
    surname: 'Blue',
    team: 'Simulation Hub',
    role: 'Simulation Analyst',
  },
]

export const machines = [
  {
    id: 'm1',
    name: 'GP-NODE-01',
    labName: 'Quantum Computing',
    macAddress: '00:1B:44:11:3A:B7',
    pduPort: 'PDU-A-14',
    teamName: 'Infrastructure',
    operatingSystem: 'Ubuntu 22.04 LTS',
    serialNumber: 'SN-992831',
    notes: 'Reserved for lattice simulations.',
    addedOn: '2023-10-15',
    cpu: 'AMD EPYC 7763',
    ram: '512GB',
    disk: '4TB NVMe',
  },
  {
    id: 'm2',
    name: 'VIS-STATION-04',
    labName: 'Robotics Lab',
    macAddress: 'AC:DE:48:00:11:22',
    pduPort: 'PDU-B-02',
    teamName: 'Computer Vision',
    operatingSystem: 'Windows 11 Pro',
    serialNumber: 'MXL2030AB',
    notes: '',
    addedOn: '2024-01-10',
    cpu: 'Intel i9-13900K',
    ram: '128GB',
    disk: '2TB SSD',
  },
  {
    id: 'm3',
    name: 'DB-SHARD-09',
    labName: 'Simulation Hub',
    macAddress: '50:6B:8D:99:4F:11',
    pduPort: 'PDU-C-22',
    teamName: 'Data Engineering',
    operatingSystem: 'RHEL 9.1',
    serialNumber: 'DELL-44920',
    notes: 'Running critical datasets.',
    addedOn: '2023-11-05',
    cpu: 'Intel Xeon Gold',
    ram: '256GB',
    disk: '10TB HDD RAID',
  },
  {
    id: 'm4',
    name: 'ML-TRAIN-ALPHA',
    labName: 'AI Research Facility',
    macAddress: '12:34:56:78:9A:BC',
    pduPort: 'PDU-A-01',
    teamName: 'AI Research',
    operatingSystem: 'Ubuntu 20.04',
    serialNumber: 'NVD-DGX-001',
    notes: 'Dedicated to LLM training.',
    addedOn: '2024-02-20',
    cpu: 'Dual AMD EPYC',
    ram: '2TB',
    disk: '30TB NVMe',
  },
  {
    id: 'm5',
    name: 'GENOME-SEQ-02',
    labName: 'Biotech Sequencing',
    macAddress: 'AA:BB:CC:11:22:33',
    pduPort: 'PDU-D-05',
    teamName: 'Genomics',
    operatingSystem: 'CentOS 7',
    serialNumber: 'ILMN-SEQ-55',
    notes: 'Legacy pipeline support.',
    addedOn: '2022-08-12',
    cpu: 'Intel Xeon Silver',
    ram: '64GB',
    disk: '8TB HDD',
  },
  {
    id: 'm6',
    name: 'FW-EDGE-01',
    labName: 'Networking Testbed',
    macAddress: '00:00:5E:00:53:AF',
    pduPort: 'PDU-E-12',
    teamName: 'Network Security',
    operatingSystem: 'Pfsense Custom',
    serialNumber: 'NET-RT-99',
    notes: 'Main gateway firewall.',
    addedOn: '2023-05-30',
    cpu: 'Intel Atom C3000',
    ram: '16GB',
    disk: '512GB SSD',
  },
  {
    id: 'm7',
    name: 'CRYO-CTRL-03',
    labName: 'Quantum Computing',
    macAddress: '98:76:54:32:10:FE',
    pduPort: 'PDU-A-09',
    teamName: 'Cryogenics',
    operatingSystem: 'Windows 10 IoT',
    serialNumber: 'LKS-CRYO-88',
    notes: 'Do not patch without vendor approval.',
    addedOn: '2023-01-15',
    cpu: 'Intel i5-11400',
    ram: '32GB',
    disk: '1TB SSD',
  },
  {
    id: 'm8',
    name: 'RENDER-FARM-10',
    labName: 'Simulation Hub',
    macAddress: '11:22:33:44:55:66',
    pduPort: 'PDU-C-18',
    teamName: 'Visualization',
    operatingSystem: 'Ubuntu 22.04',
    serialNumber: 'RF-NODE-X10',
    notes: '',
    addedOn: '2024-03-01',
    cpu: 'AMD Threadripper',
    ram: '128GB',
    disk: '2TB NVMe',
  },
  {
    id: 'm9',
    name: 'BIO-NAS-01',
    labName: 'Biotech Sequencing',
    macAddress: 'FF:EE:DD:CC:BB:AA',
    pduPort: 'PDU-D-01',
    teamName: 'Storage Ops',
    operatingSystem: 'TrueNAS Scale',
    serialNumber: 'IX-NAS-400',
    notes: 'Primary backup target.',
    addedOn: '2023-09-22',
    cpu: 'Intel Xeon Bronze',
    ram: '64GB',
    disk: '100TB RAIDZ2',
  },
  {
    id: 'm10',
    name: 'ARM-CTRL-X1',
    labName: 'Robotics Lab',
    macAddress: 'A1:B2:C3:D4:E5:F6',
    pduPort: 'PDU-B-11',
    teamName: 'Motion Control',
    operatingSystem: 'ROS 2 / Ubuntu Real-time',
    serialNumber: 'KUKA-ARM-001',
    notes: 'Experimental firmware.',
    addedOn: '2024-04-05',
    cpu: 'NVIDIA Jetson AGX',
    ram: '32GB',
    disk: '64GB eMMC',
  },
]

export const labs = [
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

export const documents = [
  {
    id: '0',
    name: 'Labbyn Overview',
    type: 'Guide',
    content: `# Labbyn

Labbyn is an application for your datacenter, laboratory or homelab. You can monitor your infrastructure, set the location of each server or platform on an interactive dashboard, store information about your assets in an inventory and more. Everything runs on a modern GUI, is deployable on most Linux machines and is **OPEN SOURCE**.

## Installation

To install you only need docker and docker compose.
Example of Debian installation:
\`\`\`bash
apt update
apt upgrade
apt install docker.io docker-compose
apt install -y docker-compose-plugin
\`\`\`

### Application script

Inside the \`scripts\` directory there is an \`app.sh\` script that can be used to manage your application.

#### Arguments:
- \`deploy\` - start/install app on your machine
- \`update\` - rebuild application if nesscesary
- \`stop\` - stop application container
- \`delete\` - delete application
- \`--dev\` - run application in development mode

> [!IMPORTANT]
> **If you use the \`delete\` argument entire application will be deleted including containers, images, volumes and networks**

### Example:

Start/Install application

\`\`\`bash
./app.sh deploy
\`\`\`

Stop application

\`\`\`bash
./app.sh stop
\`\`\`

Start application in developement mode:
\`\`\`bash
./app.sh deploy --dev
\`\`\`

**PJATK 2025**:
s26990, s26985, s27081, s27549`,
    createdBy: 'LABBYN Team',
    createdAt: new Date(Date.now() - 604800000),
    updatedAt: new Date(Date.now() - 86400000),
  },
  {
    id: '102',
    name: 'New Technician Onboarding',
    type: 'Procedure',
    content: `# Welcome to the Lab!

  This guide covers the basics for new Junior Sysadmins.

  ## Day 1 Checklist
  1.  Pick up your keycard from Security.
  2.  Set up your workstation.
  3.  Join the \`#ops-alerts\` Slack channel.

  ## Accessing the Wifi
  The lab network is hidden.

  \`\`\`bash
  SSID: Lab_Internal_5G
  Pass: Correct-Horse-Battery-Staple
  \`\`\`

  > [!IMPORTANT]
  > Do not bridge the Lab network with the Corporate Wifi. This will trigger the IDS and lock your port.`,
    createdBy: 'Adrian K',
    createdAt: new Date(Date.now() - 2592000000),
    updatedAt: new Date(Date.now() - 2592000000),
  },
  {
    id: '103',
    name: 'Emergency Power Off (EPO) Procedure',
    type: 'Safety',
    content: `# EPO Procedure

  The **Emergency Power Off** button is located at the main exit.

  ## When to use EPO
  * Visible fire / smoke.
  * Electrocution risk to personnel.
  * Catastrophic flooding.

  **DO NOT** use the EPO for standard shutdowns. It cuts power instantly and *will* corrupt databases.`,
    createdBy: 'Facility Manager',
    createdAt: new Date(Date.now() - 31536000000),
    updatedAt: new Date(Date.now() - 15000000),
  },
  {
    id: '201',
    name: 'Dell R740 BIOS Update Guide',
    type: 'Maintenance',
    content: `# BIOS Update Procedure (Dell R740)

  ## Preparation
  Ensure the server is in *Maintenance Mode* in the dashboard before starting.

  ## Steps via iDRAC
  1.  Download the \`.exe\` update package (yes, iDRAC takes .exe).
  2.  Login to iDRAC web interface.
  3.  Navigate to **Maintenance** -> **System Update**.
  4.  Upload the file.

  \`\`\`bash
  # Alternatively, via RACADM CLI
  racadm update -f bios_2.4.1.exe
  \`\`\`

  > [!IMPORTANT]
  > The fans will spin at 100% during the update. Do not be alarmed.`,
    createdBy: 'Server Team',
    createdAt: new Date(Date.now() - 172800000),
    updatedAt: new Date(Date.now() - 172800000),
  },
  {
    id: '202',
    name: 'Thermal Paste Application',
    type: 'Maintenance',
    content: `# CPU Thermal Paste Guide

  We use **Arctic MX-4** for all server repasting.

  ## The Method
  Please use the "Pea Method" or "X Pattern" for Threadripper/EPYC CPUs.

  * **Intel Xeon**: Pea size in center.
  * **AMD EPYC**: X pattern to cover multiple dies.

  **Do not** spread with a credit card. It introduces air bubbles.`,
    createdBy: 'Adrian K',
    createdAt: new Date(Date.now() - 500000000),
    updatedAt: new Date(Date.now() - 500000000),
  },
  {
    id: '203',
    name: 'RAID Configuration Standards',
    type: 'Standard',
    content: `# Standard RAID Levels

  Use the following RAID levels based on server role.

  * **OS Disks**: RAID 1 (Mirror).
  * **Database Data**: RAID 10 (Striped Mirrors) for speed.
  * **File Storage / Backups**: RAID 6 (Dual Parity).

  > [!IMPORTANT]
  > We no longer use **RAID 5** for drives larger than 2TB due to rebuild times and URE risk.`,
    createdBy: 'Storage Lead',
    createdAt: new Date(Date.now() - 1000000000),
    updatedAt: new Date(Date.now() - 1000000000),
  },
  {
    id: '204',
    name: 'Decommissioning Protocol',
    type: 'Procedure',
    content: `# Server Decommissioning

  When a server reaches End of Life (EOL), follow this process:

  1.  **Unrack**: Remove from the rack.
  2.  **DBAN**: Boot into DBAN and run a 3-pass wipe.
  3.  **Asset Tag**: Remove the asset tag sticker.
  4.  **Recycle**: Move to the e-waste cage.

  \`\`\`bash
  # Quick wipe for SSDs (NVMe)
  nvme format /dev/nvme0n1 --ses=1
  \`\`\`
  `,
    createdBy: 'Adrian K',
    createdAt: new Date(Date.now() - 86400000 * 5),
    updatedAt: new Date(Date.now() - 86400000 * 5),
  },
  {
    id: '301',
    name: 'Cabling Color Codes',
    type: 'Standard',
    content: `# Ethernet Color Standards

  To keep the racks tidy, we use specific colors for specific traffic.

  * **Blue**: Regular Data / LAN.
  * **Red**: iDRAC / IPMI / OOB Management.
  * **Yellow**: DMZ / Public Internet.
  * **Green**: Storage (iSCSI).

  ## Velcro vs Zip Ties
  **ALWAYS** use Velcro. Zip ties crush the cable cores and degrade signal quality over time.`,
    createdBy: 'NetOps',
    createdAt: new Date(Date.now() - 86400000 * 30),
    updatedAt: new Date(Date.now() - 86400000 * 30),
  },
  {
    id: '302',
    name: 'Switch Port Security',
    type: 'Security',
    content: `# Port Security

  All unused ports on access switches must be **disabled** and assigned to the Parking VLAN (999).

  ## Cisco IOS Command
  \`\`\`bash
  interface range gi1/0/10-48
  description UNUSED
  switchport access vlan 999
  shutdown
  \`\`\`

  If you need to activate a port, submit a ticket to NetOps.`,
    createdBy: 'Network Admin',
    createdAt: new Date(Date.now() - 86400000 * 10),
    updatedAt: new Date(Date.now() - 86400000 * 1),
  },
  {
    id: '303',
    name: 'Fiber Optic Handling',
    type: 'Safety',
    content: `# Fiber Optics 101

  Fiber is fragile and dangerous.

  ## Safety
  * Never look directly into a fiber cable. The laser is invisible and can blind you.
  * Dispose of fiber shards in a sealed container (they can enter the bloodstream).

  ## Types
  * **OM3**: Aqua cable (10Gb short range).
  * **OM4**: Violet/Aqua (40Gb/100Gb).
  * **OS2**: Yellow (Single mode, long range).`,
    createdBy: 'Adrian K',
    createdAt: new Date(Date.now() - 86400000 * 60),
    updatedAt: new Date(Date.now() - 86400000 * 60),
  },
  {
    id: '304',
    name: 'VLAN ID Registry',
    type: 'Network',
    content: `# VLAN ID List

  | ID | Name | Subnet |
  | -- | ---- | ------ |
  | 10 | Mgmt | 10.0.10.0/24 |
  | 20 | Server | 10.0.20.0/24 |
  | 30 | Wifi | 10.0.30.0/24 |
  | 40 | Guest| 172.16.0.0/24 |

  *Note: Table rendering not yet supported, view raw source for details.*`,
    createdBy: 'Network Admin',
    createdAt: new Date(Date.now() - 86400000 * 2),
    updatedAt: new Date(Date.now() - 86400000 * 2),
  },
  {
    id: '401',
    name: 'NetBox Naming Convention',
    type: 'Standard',
    content: `# Device Naming Convention

  We follow the \`LOCATION-ROLE-INDEX\` format.

  ## Examples
  * **GDN-RTR-01**: Gdańsk, Router, 01.
  * **WAW-SW-ACC-02**: Warsaw, Switch (Access), 02.
  * **NYC-SRV-DB-05**: New York, Server (Database), 05.

  > [!IMPORTANT]
  > If you add a device to the rack without adding it to NetBox, the monitoring system will not pick it up.`,
    createdBy: 'Adrian K',
    createdAt: new Date(Date.now() - 86400000 * 100),
    updatedAt: new Date(Date.now() - 86400000 * 5),
  },
  {
    id: '402',
    name: 'IPMI Tool Cheat Sheet',
    type: 'Guide',
    content: `# IPMI Cheat Sheet

  Useful commands for remote management when the OS is frozen.

  ## Power Commands
  \`\`\`bash
  # Check status
  ipmitool -I lanplus -H 10.0.10.5 -U admin -P secret power status

  # Force soft shutdown (ACPI)
  ipmitool -I lanplus -H 10.0.10.5 -U admin -P secret power soft

  # Force hard reset (Cold boot)
  ipmitool -I lanplus -H 10.0.10.5 -U admin -P secret power reset
  \`\`\`

  ## Sensor Readings
  \`\`\`bash
  ipmitool -I lanplus -H 10.0.10.5 -U admin -P secret sdr type temperature
  \`\`\`
  `,
    createdBy: 'SysAdmin',
    createdAt: new Date(Date.now() - 86400000 * 12),
    updatedAt: new Date(Date.now() - 86400000 * 12),
  },
  {
    id: '403',
    name: 'Monitoring Alerts Explained',
    type: 'Guide',
    content: `# Alert Dictionary

  Understanding Prometheus alerts.

  * **HighCPU**: CPU > 90% for 5 minutes. Check for runaway processes.
  * **DiskPressure**: Disk usage > 85%. Run cleanup scripts.
  * **KubePodCrashLoop**: Pod restarting > 5 times. Check \`kubectl logs\`.

  ## Silencing Alerts
  To silence an alert during maintenance, use the **AlertManager** dashboard, not the Discord mute button.`,
    createdBy: 'SRE Team',
    createdAt: new Date(Date.now() - 86400000 * 20),
    updatedAt: new Date(Date.now() - 86400000 * 20),
  },
  {
    id: '501',
    name: 'Cooling System: Hot Aisle / Cold Aisle',
    type: 'Guide',
    content: `# Airflow Management

  We utilize a **Cold Aisle Containment** system.

  ## Rules
  1.  **Blanking Panels**: Every empty rack unit (U) must have a blanking panel. This prevents hot air from recirculating back to the front.
  2.  **Cable Arms**: Ensure cable management arms do not block the rear exhaust.

  **Target Temperature**:
  * Intake (Front): 20°C - 24°C
  * Exhaust (Rear): 35°C+`,
    createdBy: 'Facility Manager',
    createdAt: new Date(Date.now() - 86400000 * 300),
    updatedAt: new Date(Date.now() - 86400000 * 300),
  },
  {
    id: '502',
    name: 'UPS Load Balancing',
    type: 'Guide',
    content: `# UPS Power Distribution

  Each rack has two PDUs: **A side** and **B side**.

  ## Plugging in Servers
  * PSU 1 -> PDU A
  * PSU 2 -> PDU B

  > [!IMPORTANT]
  > Never plug both power supplies into the same PDU. If that PDU fails, the server dies.

  ## Current Load
  * UPS-01: 45% (Nominal)
  * UPS-02: 42% (Nominal)`,
    createdBy: 'Adrian K',
    createdAt: new Date(Date.now() - 86400000 * 15),
    updatedAt: new Date(Date.now() - 86400000 * 15),
  },
  {
    id: '601',
    name: 'Proxmox Cluster Setup',
    type: 'Guide',
    content: `# Proxmox Cluster

  Our virtualization cluster consists of 3 nodes: \`pve-01\`, \`pve-02\`, \`pve-03\`.

  ## Quorum
  We need at least 2 nodes online to maintain quorum. If 2 nodes fail, the cluster becomes read-only to prevent split-brain.

  ## Storage
  * **local-zfs**: Fast, local NVMe storage (No migration).
  * **ceph-pool**: Distributed storage (Supports live migration).`,
    createdBy: 'Virtualization Team',
    createdAt: new Date(Date.now() - 86400000 * 80),
    updatedAt: new Date(Date.now() - 86400000 * 2),
  },
  {
    id: '602',
    name: 'Ansible Inventory',
    type: 'Guide',
    content: `# Ansible Hosts File

  Location: \`/etc/ansible/hosts\`

  \`\`\`ini
  [webservers]
  web-01.lab.local
  web-02.lab.local

  [dbservers]
  db-01.lab.local

  [switches:vars]
  ansible_network_os=ios
  ansible_user=cisco
  \`\`\`

  Run the playbook:
  \`ansible-playbook -i hosts site.yml\``,
    createdBy: 'DevOps',
    createdAt: new Date(Date.now() - 86400000 * 45),
    updatedAt: new Date(Date.now() - 86400000 * 45),
  },
  {
    id: '603',
    name: 'Docker Registry Cleanup',
    type: 'Maintenance',
    content: `# Cleaning the Registry

  Our private registry fills up quickly with CI builds.

  ## Garage Garbage Collector
  Run the garbage collector manually if disk usage is critical.

  \`\`\`bash
  docker exec -it registry bin/registry garbage-collect /etc/docker/registry/config.yml
  \`\`\`

  *Note: This will delete untagged layers.*`,
    createdBy: 'Adrian K',
    createdAt: new Date(Date.now() - 86400000 * 9),
    updatedAt: new Date(Date.now() - 86400000 * 9),
  },
  {
    id: '604',
    name: 'SSH Key Management',
    type: 'Security',
    content: `# SSH Access

  We do not allow password login on servers.

  ## Adding a Key
  Add your public key to \`~/.ssh/authorized_keys\`.

  ## Generating a Key (Ed25519)
  We prefer Ed25519 over RSA.

  \`\`\`bash
  ssh-keygen -t ed25519 -C "adrian@lab.local"
  \`\`\`

  > [!IMPORTANT]
  > If you lose your private key, you lose access. We cannot recover it for you.`,
    createdBy: 'Security Team',
    createdAt: new Date(Date.now() - 86400000 * 150),
    updatedAt: new Date(Date.now() - 86400000 * 150),
  },
]
