import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import type { User } from '@/types/types'
import api from '@/lib/api'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Spinner } from '@/components/ui/spinner'

export interface AuthState {
  isAuthenticated: boolean
  user: User | null
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const storedAuth = localStorage.getItem('auth')
    const storedUser = localStorage.getItem('user')

    if (storedAuth === 'true' && storedUser) {
      setIsAuthenticated(true)
      setUser(JSON.parse(storedUser))
    }
    setIsLoading(false)
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const params = new URLSearchParams()
    params.append('grant_type', '')
    params.append('username', username)
    params.append('password', password)
    params.append('scope', '')
    params.append('client_id', '')
    params.append('client_secret', '')

    const loginRes = await api.post('/auth/login', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })

    const { access_token } = loginRes.data
    localStorage.setItem('access_token', access_token)

    // 2. Fetch the user profile data using the received token
    try {
      const userRes = await api.get<User>('/users/me')
      const userData = userRes.data

      setUser(userData)
      setIsAuthenticated(true)
      localStorage.setItem('auth', 'true')
      localStorage.setItem('user', JSON.stringify(userData))
    } catch (error) {
      localStorage.removeItem('access_token')
      throw error
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      // Call the backend logout endpoint
      await api.post('/auth/logout')
    } catch (error) {
      console.error('Failed to logout on backend:', error)
    } finally {
      // Always clear local state and storage regardless of API success
      setUser(null)
      setIsAuthenticated(false)
      localStorage.removeItem('auth')
      localStorage.removeItem('user')
      localStorage.removeItem('access_token')
    }
  }, [])

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Spinner className="text-primary size-8" />
            </EmptyMedia>
            <EmptyTitle>Authenticating...</EmptyTitle>
            <EmptyDescription>
              Please wait while we verify your session.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
