import { create } from 'zustand'
import type { Equipment } from '@/types/types'

interface LabState {
  equipment: Record<string, Equipment>
  initEquipment: (eqArray: Equipment[]) => void
  addEquipment: (eq: Equipment) => void
  updateEquipment: (id: string, updates: Partial<Equipment>) => void
  deleteEquipment: (id: string) => void
  getEquipmentArray: () => Equipment[]
}

export const useLabStore = create<LabState>((set, get) => ({
  equipment: {},
  
  initEquipment: (eqArray) => 
    set({ equipment: Object.fromEntries(eqArray.map((e) => [e.id, e])) }),
    
  addEquipment: (eq) => 
    set((state) => ({ equipment: { ...state.equipment, [eq.id]: eq } })),
    
  updateEquipment: (id, updates) => 
    set((state) => ({
      equipment: { ...state.equipment, [id]: { ...state.equipment[id], ...updates } }
    })),
    
  deleteEquipment: (id) => 
    set((state) => {
      const newEq = { ...state.equipment }
      delete newEq[id]
      return { equipment: newEq }
    }),
    
  getEquipmentArray: () => Object.values(get().equipment),
}))
