import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type {
  MachineUpdate,
  MachinesResponse,
  MetadataResponse,
  PlatformFormValues,
} from './machines.types'
import api from '@/lib/api'

const PATHS = {
  MACHINES: '/db/machines/',
  METADATA: '/db/metadata/',
  DISCOVERY: '/ansible/discovery',
  SETUP_AGENT: '/ansible/setup_agent',
  PROMETHEUS: '/prometheus/target',
  DETAIL: (id: string | number) => `/db/machines/${id}`,
  REFRESH: (id: string | number) => `/ansible/machine/${id}/refresh`,
}

export const handlePlatformSubmission = async (values: PlatformFormValues) => {
  const results = []

  // 1. Add to Database
  if (values.addToDb) {
    // Create metadata record first as required by MachinesCreate schema
    const { data: metadata } = await api.post<MetadataResponse>(
      PATHS.METADATA,
      {
        agent_prometheus: false,
        ansible_access: false,
        ansible_root_access: false,
      },
    )

    try {
      const { data: machine } = await api.post<MachinesResponse>(
        PATHS.MACHINES,
        {
          name: values.name || values.hostname,
          localization_id: values.location || 1, // Default room ID
          metadata_id: metadata.id,
          ip_address: values.ip || null,
          mac_address: values.mac || null,
          pdu_port: values.pdu_port || null,
          team_id: values.team || null,
          os: values.os || null,
          serial_number: values.sn || null,
          note: values.note || null,
          cpus: values.cpu || [],
          ram: values.ram || null,
          disks: values.disk || [],
          shelf_id: values.layout || null,
        },
      )
      results.push(machine)
    } catch (error) {
      // Rollback metadata if machine creation fails
      await api.delete(`${PATHS.METADATA}${metadata.id}`).catch(console.error)
      throw error
    }
  }

  const ansiblePayload = {
    host: values.hostname,
    extra_vars: {
      ansible_user: values.login,
      ansible_password: values.password,
      ansible_become_password: values.password,
    },
  }

  // 2. Deploy Agent
  if (values.deployAgent) {
    const deploy = api.post(PATHS.SETUP_AGENT, ansiblePayload)
    const prometheus = api.post(PATHS.PROMETHEUS, {
      instance: `${values.hostname}:9100`,
      labels: { env: 'virtual', host: values.hostname, role: 'virtual' },
    })
    results.push(await Promise.all([deploy, prometheus]))
  }

  // 3. Scan Platform
  if (values.scanPlatform) {
    const { data: scan } = await api.post(PATHS.DISCOVERY, {
      hosts: [values.hostname],
      extra_vars: ansiblePayload.extra_vars,
    })
    results.push(scan)
  }

  return results
}

export const useUpdateMachineMutation = (machineId: string | number) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (machineData: MachineUpdate) => {
      const { data } = await api.put(PATHS.DETAIL(machineId), machineData)
      return data
    },
    onSuccess: () => {
      toast.success('Machine updated successfully')
      queryClient.invalidateQueries({ queryKey: ['machines'] })
      queryClient.invalidateQueries({
        queryKey: ['machines', String(machineId)],
      })
    },
  })
}

export async function autoDiscoverMutation(
  machineId: string | number,
  formData,
) {
  const { data } = await api.post(PATHS.REFRESH(machineId), formData)
  return data
}
