import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Spinner } from '@/components/ui/spinner'

interface User {
  id: string
  username: string
  email: string
}

interface AuthState {
  isAuthenticated: boolean
  user: User | null
  login: (username: string) => Promise<void>
  logout: () => void
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

  const login = useCallback(async (username: string) => {
    // Simulate API call delay for testing
    await new Promise((resolve) => setTimeout(resolve, 500))

    if (username === 'admin') {
      const newUser = {
        id: '1',
        username: 'Zbigniew Trąba',
        email: 'ekspert.od.kabelkow@labbyn.com',
      }
      setUser(newUser)
      setIsAuthenticated(true)

      localStorage.setItem('auth', 'true')
      localStorage.setItem('user', JSON.stringify(newUser))
    } else {
      throw new Error('Invalid credentials')
    }
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    setIsAuthenticated(false)
    localStorage.removeItem('auth')
    localStorage.removeItem('user')
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
