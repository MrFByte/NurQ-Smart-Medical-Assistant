import { SessionStatus } from '@/types'

const STATUS_CONFIG: Record<
  SessionStatus,
  { label: string; light: string; dark: string; dot: string }
> = {
  in_progress: {
    label: 'In Progress',
    light: 'bg-amber-50 text-amber-700 border-amber-300',
    dark: 'dark:bg-warning/15 dark:text-warning dark:border-warning/30',
    dot: 'bg-amber-500 dark:bg-warning',
  },
  completed: {
    label: 'Completed',
    light: 'bg-emerald-50 text-emerald-700 border-emerald-300',
    dark: 'dark:bg-success/15 dark:text-success dark:border-success/30',
    dot: 'bg-emerald-500 dark:bg-success',
  },
  emergency_escalated: {
    label: 'Emergency',
    light: 'bg-red-50 text-red-700 border-red-300',
    dark: 'dark:bg-danger/15 dark:text-danger dark:border-danger/30',
    dot: 'bg-red-500 dark:bg-danger',
  },
  abandoned: {
    label: 'Abandoned',
    light: 'bg-slate-100 text-slate-700 border-slate-300',
    dark: 'dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    dot: 'bg-slate-500 dark:bg-slate-400',
  },
}

export default function StatusBadge({ status }: { status: SessionStatus }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span className={`badge ${cfg.light} ${cfg.dark}`}>
      <span
        className={`h-1.5 w-1.5 rounded-full ${cfg.dot} ${status === 'in_progress' ? 'animate-pulse-soft' : ''}`}
      />
      {cfg.label}
    </span>
  )
}
