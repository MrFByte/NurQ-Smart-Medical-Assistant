import { Link } from 'react-router-dom'
import { Calendar, Loader2, Sparkles, Stethoscope } from 'lucide-react'
import { usePastVisits } from '@/hooks/usePastVisits'
import StatusBadge from '@/components/StatusBadge'
import VisitTypeBadge from '@/components/VisitTypeBadge'
import { SessionStatus } from '@/types'

export default function PastVisitsTab({
  patientId, currentSessionId, active,
}: {
  patientId: string; currentSessionId: string; active: boolean
}) {
  const { data: visits = [], isLoading, isError } = usePastVisits(patientId, currentSessionId, active)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading past visits…
      </div>
    )
  }

  if (isError) {
    return <div className="py-12 text-center text-red-500 text-sm">Failed to load past visits.</div>
  }

  if (visits.length === 0) {
    return <div className="py-12 text-center text-slate-400 text-sm">No prior visits for this patient.</div>
  }

  return (
    <div className="space-y-3">
      {visits.map((visit) => (
        <div key={visit.session_id} className="rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 p-4">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(visit.created_at).toLocaleDateString()}
            </span>
            <StatusBadge status={visit.session_status as SessionStatus} />
            <VisitTypeBadge visitType={visit.visit_type} />
          </div>
          <div className="flex items-center gap-2 mb-3">
            <Stethoscope className="h-4 w-4 text-accent-600 dark:text-accent-400" />
            <span className="text-sm text-slate-700 dark:text-slate-200">{visit.chief_complaint || 'No chief complaint recorded'}</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to={`/session/${visit.session_id}`} className="btn-ghost text-xs py-1.5">
              View session
            </Link>
            <Link to={`/session/${visit.session_id}/summary`} className="btn-ghost text-xs py-1.5">
              <Sparkles className="h-3.5 w-3.5" /> View summary
            </Link>
          </div>
        </div>
      ))}
    </div>
  )
}
