import api from '@/lib/api'
import type { PlatformFormValues } from './add-platform.types'

const PATHS = {
  METADATA: '/db/metadata',
  METADATA_ID: (id: number) => `/db/metadata/${id}`,
  MACHINES: '/db/machines',
  SCAN: '/ansible/discovery',
  DEPLOY: '/ansible/setup_agent',
  PROMETHEUS: '/prometheus/target',
}

export const createPlatformMachine = async (values: PlatformFormValues) => {
  const results = []

  if (values.addToDb) {
    const metadataPayload = {
      agent_prometheus: false,
      ansible_access: false,
      ansible_root_access: false,
    }

    const { data: metadata } = await api.post<{ id: number }>(PATHS.METADATA, metadataPayload)
    results.push(metadata)

    const machinePayload = {
      name: values.name || values.hostname,
      ip_address: values.ip || undefined,
      mac_address: values.mac || undefined,
      localization_id: values.location || 1,
      pdu_port: values.pdu_port,
      team_id: values.team,
      os: values.os,
      serial_number: values.sn,
      note: values.note,
      cpu: values.cpu,
      ram: values.ram,
      disk: values.disk,
      layout_id: values.layout,
      metadata_id: metadata.id,
    }

    try {
      const { data: machine } = await api.post(PATHS.MACHINES, machinePayload)
      results.push(machine)
    } catch (error) {
      await api.delete(PATHS.METADATA_ID(metadata.id)).catch(console.error)
      throw error
    }
  }

  if (values.deployAgent) {
    const deployPayload = {
      host: values.hostname,
      extra_vars: {
        ansible_user: values.login,
        ansible_password: values.password,
        ansible_become_password: values.password,
      },
    }
    const prometheusPayload = {
      instance: `${values.hostname}:9100`,
      labels: {
        env: 'virtual',
        host: values.hostname,
        role: 'virtual',
      },
    }

    const [deployRes, promRes] = await Promise.all([
      api.post(PATHS.DEPLOY, deployPayload),
      api.post(PATHS.PROMETHEUS, prometheusPayload),
    ])
    
    results.push(deployRes.data)
    results.push(promRes.data)
  }

  if (values.scanPlatform) {
    const scanPayload = {
      hosts: [values.hostname],
      extra_vars: {
        ansible_user: values.login,
        ansible_password: values.password,
        ansible_become_password: values.password,
      },
    }
    const { data } = await api.post(PATHS.SCAN, scanPayload)
    results.push(data)
  }

  return results
}