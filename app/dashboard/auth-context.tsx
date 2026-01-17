'use client'

import { createContext, useContext } from 'react'

interface User {
  id: string
  email: string
  fullName: string | null
  plan: string
  profilePhoto: string | null
  licenseKey: string
  subscriptionEndDate: string | null
  renewalReminderSent: boolean
  renewalIgnored: boolean
  billingType: 'monthly' | 'annual' | 'lifetime' | null
}

interface AuthContextType {
  user: User | null
  loading: boolean
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: async () => {},
  refreshUser: async () => {}
})

export function useAuth() {
  return useContext(AuthContext)
}

export type { User, AuthContextType }
