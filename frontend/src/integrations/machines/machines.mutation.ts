import { useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  AgentDialogPayload,
  AutoDiscoverPayload,
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
  REMOVE_AGENT: (id: string | number) => `/ansible/machine/${id}/cleanup`,
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
          localization_id: values.localization_id || 1, // Default room ID
          metadata_id: metadata.id,
          ip_address: values.ip_address || null,
          mac_address: values.mac_address || null,
          pdu_port: values.pdu_port || null,
          team_id: values.team_id || null,
          os: values.os || null,
          serial_number: values.serial_number || null,
          note: values.note || null,
          cpus: values.cpus || [],
          ram: values.ram || null,
          disks: values.disks || [],
          shelf_id: values.shelf_id || null,
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
    mutationKey: ['update-machine'],
    mutationFn: (machineData: MachineUpdate) =>
      api.patch(PATHS.DETAIL(machineId), machineData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] })
    },
  })
}

export const useDeleteMachineMutation = (machineId: string | number) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ['delete-machine'],
    mutationFn: () => api.delete(PATHS.DETAIL(machineId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] })
    },
  })
}

export async function autoDiscoverMutation(
  machineId: string | number,
  formData: AutoDiscoverPayload,
) {
  const { data } = await api.post(PATHS.REFRESH(machineId), formData)
  return data
}

export const useDeployAgent = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ['deploy-agent'],
    mutationFn: async (formData: AgentDialogPayload) => {
      const ansiblePayload = {
        host: formData.host,
        extra_vars: {
          ansible_user: formData.username,
          ansible_password: formData.password,
          ansible_become_password: formData.password,
        },
      }

      const deployResponse = await api.post(PATHS.SETUP_AGENT, ansiblePayload)

      const prometheusResponse = await api.post(PATHS.PROMETHEUS, {
        instance: `${formData.host}:9100`,
        labels: { env: 'virtual', host: formData.host, role: 'virtual' },
      })
      const discoveryResponse = await api.post(PATHS.DISCOVERY, {
        hosts: [formData.host],
        extra_vars: ansiblePayload.extra_vars,
      })

      return { deployResponse, prometheusResponse, discoveryResponse }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] })
    },
  })
}

export const useDeleteAgent = (machineId: string | number) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ['delete-agent'],
    mutationFn: async (formData: AgentDialogPayload) => {
      const ansiblePayload = {
        host: formData.host,
        extra_vars: {
          ansible_user: formData.username,
          ansible_password: formData.password,
          ansible_become_password: formData.password,
        },
      }

      const removeResponse = await api.post(
        PATHS.REMOVE_AGENT(machineId),
        ansiblePayload,
      )

      const prometheusResponse = await api.delete(PATHS.PROMETHEUS, {
        data: { instance: `${formData.host}` },
      })

      const discoveryResponse = await api.post(PATHS.DISCOVERY, {
        hosts: [formData.host],
        extra_vars: ansiblePayload.extra_vars,
      })

      return { removeResponse, prometheusResponse, discoveryResponse }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] })
    },
  })
}
