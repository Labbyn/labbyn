import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import type { Document } from '@/types/types'
import { DocumentList } from '@/components/document-list'
import { DocumentEditor } from '@/components/document-editor'
import { DocumentPreview } from '@/components/document-preview'
import { ScrollArea } from '@/components/ui/scroll-area'

export const Route = createFileRoute('/docs')({
  component: RouteComponent,
})

function RouteComponent() {
  const [documents, setDocuments] = useState<Array<Document>>([])
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Demo: Load documents from localStorage on mount
  useEffect(() => {
    const sampleDocs: Array<Document> = [
      // --- LAB OPERATIONS & SAFETY ---
      {
        id: '0',
        name: 'Labbyn Overview',
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

      // --- SERVER MAINTENANCE ---
      {
        id: '201',
        name: 'Dell R740 BIOS Update Guide',
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

      // --- NETWORKING & CABLING ---
      {
        id: '301',
        name: 'Cabling Color Codes',
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

      // --- DCIM & TOOLS ---
      {
        id: '401',
        name: 'NetBox Naming Convention',
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

      // --- ENVIRONMENT & COOLING ---
      {
        id: '501',
        name: 'Cooling System: Hot Aisle / Cold Aisle',
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

      // --- SOFTWARE & CONFIG ---
      {
        id: '601',
        name: 'Proxmox Cluster Setup',
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

    setDocuments(sampleDocs)
    localStorage.setItem('documents', JSON.stringify(sampleDocs))
    setIsLoading(false)
  }, [])

  const handleSave = (updatedDoc: Document) => {
    const updated = documents.map((doc) =>
      doc.id === updatedDoc.id ? { ...updatedDoc, updatedAt: new Date() } : doc,
    )
    setDocuments(updated)
    setSelectedDoc({ ...updatedDoc, updatedAt: new Date() })
    localStorage.setItem('documents', JSON.stringify(updated))
    setIsEditing(false)
  }

  const handleDelete = (docId: string) => {
    const filtered = documents.filter((doc) => doc.id !== docId)
    setDocuments(filtered)
    if (selectedDoc?.id === docId) {
      setSelectedDoc(null)
      setIsEditing(false)
    }
    localStorage.setItem('documents', JSON.stringify(filtered))
  }

  const handleSelectDocument = (doc: Document) => {
    setSelectedDoc(doc)
    setIsEditing(false)
  }

  const handleCreateDocument = () => {
    const newDoc: Document = {
      id: Date.now().toString(),
      name: 'New Document',
      content: '',
      createdBy: 'Zbigniew Trąba',
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const updated = [newDoc, ...documents]
    setDocuments(updated)
    setSelectedDoc(newDoc)
    setIsEditing(true)
    localStorage.setItem('documents', JSON.stringify(updated))
  }

  if (isLoading) {
    return <div className="p-6">Loading...</div>
  }

  return (
    <div className="h-auto xl:h-screen w-full xl:overflow-hidden">
      <div className="grid grid-cols-1 xl:grid-cols-5 h-full">
        <div className="xl:col-span-2 h-full xl:overflow-y-hidden">
          <ScrollArea className="h-full" dir="rtl">
            <div className="p-4 pb-0 xl:p-6 xl:pb-6 xl:pr-3" dir="ltr">
              <DocumentList
                documents={documents}
                selectedDoc={selectedDoc}
                onSelectDocument={handleSelectDocument}
                onCreateDocument={handleCreateDocument}
                onDeleteDocument={handleDelete}
              />
            </div>
          </ScrollArea>
        </div>
        <div className="xl:col-span-3 w-full h-full xl:overflow-hidden">
          {selectedDoc ? (
            <ScrollArea className="h-full">
              <div className="p-4 xl:p-6 xl:pl-3">
                {isEditing ? (
                  <DocumentEditor
                    document={selectedDoc}
                    onSave={handleSave}
                    onCancel={() => setIsEditing(false)}
                  />
                ) : (
                  <DocumentPreview
                    document={selectedDoc}
                    onEdit={() => setIsEditing(true)}
                  />
                )}
              </div>
            </ScrollArea>
          ) : (
            <div className="h-full p-4 xl:p-6 xl:pl-3">
              <div className="h-full flex flex-col p-6 items-center justify-center text-center rounded-xl border-2 border-dashed border-border">
                <div>
                  <p className="text-foreground/60 font-medium">
                    No document selected
                  </p>
                  <p className="text-sm text-foreground/40 mt-1">
                    Select a document from the list to view or edit
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
