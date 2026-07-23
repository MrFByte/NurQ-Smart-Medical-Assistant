import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { mockLogin } from '../mockData'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { Lock, User, Loader2, AlertCircle, Moon, Sun } from 'lucide-react'
import doctorIcon from '../assets/nurq-doctor-icon.svg'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login: storeToken } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = mockLogin(username, password)
      storeToken(res.access_token)
      navigate('/queue', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 animate-fade-in relative">
      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="absolute top-6 right-6 h-9 w-9 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 flex items-center justify-center transition-all duration-200"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? <Moon className="h-4 w-4 text-accent-400" /> : <Sun className="h-4 w-4 text-accent-600" />}
      </button>

      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center shadow-[0_0_40px_rgba(34,211,238,0.30)] dark:shadow-[0_0_40px_rgba(34,211,238,0.35)] mb-4 overflow-hidden">
            <img src={doctorIcon} alt="Nurq Logo" className="h-full w-full object-cover" />
          </div>
          <h1 className="font-display text-2xl font-semibold text-slate-800 dark:text-white">NurQ</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Clinician Console — Sign in to continue</p>
        </div>

        {/* Card */}
        <div className="glass p-8 animate-slide-up">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 dark:bg-danger/10 border border-red-300 dark:border-danger/30 text-red-600 dark:text-danger text-sm animate-fade-in">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Username</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="dr.smith"
                  className="input pl-11"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input pl-11"
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Authenticating…
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-6">
            Demo mode — any non-empty credentials will sign you in.
          </p>
        </div>
      </div>
    </div>
  )
}
