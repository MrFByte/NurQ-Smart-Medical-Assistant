import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { LogOut } from 'lucide-react'
import ThemeToggle from './ThemeToggle'
import doctorIcon from '@/assets/nurq-doctor-icon.svg'

export default function TopBar() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/70 dark:bg-ink-950/70 border-b border-slate-200 dark:border-white/10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/queue" className="flex items-center gap-2.5 group">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center shadow-[0_0_20px_rgba(34,211,238,0.25)] dark:shadow-[0_0_20px_rgba(34,211,238,0.30)] group-hover:shadow-[0_0_28px_rgba(34,211,238,0.40)] transition-shadow overflow-hidden">
            <img src={doctorIcon} alt="Nurq Logo" className="h-full w-full object-cover" />
          </div>
          <div className="leading-tight">
            <div className="font-display font-semibold text-base text-slate-800 dark:text-white">NurQ</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 tracking-wide">Clinician Console</div>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button onClick={handleLogout} className="btn-ghost text-sm">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>
    </header>
  )
}
