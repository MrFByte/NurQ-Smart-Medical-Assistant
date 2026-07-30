import { Activity, Loader2 } from 'lucide-react'
import { useConditions } from '@/hooks/useConditions'

export default function ConditionsTab({ patientId, active }: { patientId: string; active: boolean }) {
  const { data: conditions = [], isLoading, isError } = useConditions(patientId, active)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading conditions…
      </div>
    )
  }

  if (isError) {
    return <div className="py-12 text-center text-red-500 text-sm">Failed to load conditions.</div>
  }

  if (conditions.length === 0) {
    return <div className="py-12 text-center text-slate-400 text-sm">No chronic conditions recorded.</div>
  }

  return (
    <div className="space-y-3">
      {conditions.map((c) => (
        <div
          key={c.id}
          className="flex items-center gap-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 p-4"
        >
          <Activity className="h-4 w-4 text-accent-600 dark:text-accent-400 shrink-0" />
          <span className="font-medium text-slate-800 dark:text-white flex-1">{c.condition_name}</span>
          <span
            className={`badge text-[11px] ${
              c.status === 'active'
                ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-warning/15 dark:text-warning dark:border-warning/30'
                : 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
            }`}
          >
            {c.status}
          </span>
        </div>
      ))}
    </div>
  )
}
