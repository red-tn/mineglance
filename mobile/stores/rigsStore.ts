import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Rig } from '@/types';

const API_BASE = 'https://www.mineglance.com/api';

interface RigsStore {
  rigs: Rig[];
  isLoading: boolean;

  // Rig management
  addRig: (rig: Rig) => Promise<void>;
  removeRig: (id: string) => Promise<void>;
  updateRig: (id: string, updates: Partial<Rig>) => Promise<void>;
  setRigs: (rigs: Rig[]) => void;

  // Loading state
  setLoading: (loading: boolean) => void;

  // Storage & Sync
  loadFromStorage: () => Promise<void>;
  saveToStorage: () => Promise<void>;
  loadFromServer: () => Promise<void>;
  syncToServer: (rig: Rig, method: 'POST' | 'PUT' | 'DELETE') => Promise<void>;

  // Computed values
  getTotalPower: () => number;
}

async function getAuthToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync('authToken');
  } catch {
    return null;
  }
}

export const useRigsStore = create<RigsStore>((set, get) => ({
  rigs: [],
  isLoading: false,

  addRig: async (rig: Rig) => {
    set((state) => ({
      rigs: [...state.rigs, rig],
    }));

    await get().saveToStorage();
    await get().syncToServer(rig, 'POST');
  },

  removeRig: async (id: string) => {
    const rig = get().rigs.find(r => r.id === id);

    set((state) => ({
      rigs: state.rigs.filter((r) => r.id !== id),
    }));

    await get().saveToStorage();

    if (rig) {
      await get().syncToServer(rig, 'DELETE');
    }
  },

  updateRig: async (id: string, updates: Partial<Rig>) => {
    set((state) => ({
      rigs: state.rigs.map((r) =>
        r.id === id ? { ...r, ...updates } : r
      ),
    }));

    await get().saveToStorage();

    const updatedRig = get().rigs.find(r => r.id === id);
    if (updatedRig) {
      await get().syncToServer(updatedRig, 'PUT');
    }
  },

  setRigs: (rigs: Rig[]) => {
    set({ rigs });
    get().saveToStorage();
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  loadFromStorage: async () => {
    try {
      const stored = await AsyncStorage.getItem('rigs');
      if (stored) {
        const rigs = JSON.parse(stored);
        set({ rigs });
      }
    } catch (error) {
      console.error('Failed to load rigs:', error);
    }
  },

  saveToStorage: async () => {
    try {
      const { rigs } = get();
      await AsyncStorage.setItem('rigs', JSON.stringify(rigs));
    } catch (error) {
      console.error('Failed to save rigs:', error);
    }
  },

  loadFromServer: async () => {
    const authToken = await getAuthToken();
    if (!authToken) return;

    try {
      const response = await fetch(`${API_BASE}/rigs/sync`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.rigs && Array.isArray(data.rigs)) {
          const rigs: Rig[] = data.rigs.map((r: any) => ({
            id: r.id,
            name: r.name,
            gpu: r.gpu,
            power: r.power || 200,
            quantity: r.quantity || 1,
          }));

          set({ rigs });
          await get().saveToStorage();
          console.log('Rigs loaded from server:', rigs.length);
        }
      }
    } catch (error) {
      console.error('Failed to load rigs from server:', error);
    }
  },

  syncToServer: async (rig: Rig, method: 'POST' | 'PUT' | 'DELETE') => {
    const authToken = await getAuthToken();
    if (!authToken) return;

    try {
      const url = method === 'DELETE'
        ? `${API_BASE}/rigs/sync?id=${rig.id}`
        : `${API_BASE}/rigs/sync`;

      const options: RequestInit = {
        method,
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      };

      if (method !== 'DELETE') {
        options.body = JSON.stringify({
          id: rig.id,
          name: rig.name,
          gpu: rig.gpu,
          power: rig.power || 200,
          quantity: rig.quantity || 1,
        });
      }

      const response = await fetch(url, options);

      if (method === 'POST' && response.ok) {
        const data = await response.json();
        if (data.rig?.id && data.rig.id !== rig.id) {
          // Update local rig with server-assigned ID
          set((state) => ({
            rigs: state.rigs.map(r =>
              r.id === rig.id ? { ...r, id: data.rig.id } : r
            ),
          }));
          await get().saveToStorage();
        }
      }
    } catch (error) {
      console.log('Rig sync to server failed:', error);
    }
  },

  getTotalPower: () => {
    const { rigs } = get();
    return rigs.reduce((total, rig) => total + (rig.power * rig.quantity), 0);
  },
}));
