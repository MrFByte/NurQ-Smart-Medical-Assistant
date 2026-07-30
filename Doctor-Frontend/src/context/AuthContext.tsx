import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthContextValue {
  session: Session | null
  token: string | null
  logout: () => Promise<void>
  isAuthenticated: boolean
  isLoading: boolean
  activeClinicianId: string | null
  setActiveClinicianId: (id: string | null) => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const ACTIVE_CLINICIAN_STORAGE_KEY = 'nurq.activeClinicianId'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeClinicianId, setActiveClinicianIdState] = useState<string | null>(
    () => localStorage.getItem(ACTIVE_CLINICIAN_STORAGE_KEY)
  )

  const setActiveClinicianId = (id: string | null) => {
    setActiveClinicianIdState(id)
    if (id) {
      localStorage.setItem(ACTIVE_CLINICIAN_STORAGE_KEY, id)
    } else {
      localStorage.removeItem(ACTIVE_CLINICIAN_STORAGE_KEY)
    }
  }

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setIsLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setIsLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const logout = async () => {
    await supabase.auth.signOut()
  }

  const value = {
    session,
    token: session?.access_token ?? null,
    logout,
    isAuthenticated: !!session,
    isLoading,
    activeClinicianId,
    setActiveClinicianId
  }

  return (
    <AuthContext.Provider value={value}>
      {!isLoading && children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
