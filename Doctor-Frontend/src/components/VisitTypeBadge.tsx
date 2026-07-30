import { VisitType } from '@/types'

const VISIT_TYPE_CONFIG: Record<NonNullable<VisitType>, { label: string; light: string; dark: string }> = {
  new_issue: {
    label: 'Returning — New Issue',
    light: 'bg-sky-50 text-sky-700 border-sky-300',
    dark: 'dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30',
  },
  continuation: {
    label: 'Returning — Continuation',
    light: 'bg-violet-50 text-violet-700 border-violet-300',
    dark: 'dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-500/30',
  },
}

export default function VisitTypeBadge({ visitType }: { visitType: VisitType }) {
  if (!visitType) {
    return (
      <span className="badge bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
        New Patient
      </span>
    )
  }

  const cfg = VISIT_TYPE_CONFIG[visitType]
  return <span className={`badge ${cfg.light} ${cfg.dark}`}>{cfg.label}</span>
}
