import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, Hash, Loader2, Sparkles, User } from 'lucide-react'
import { updateSessionStatus } from '@/lib/session_details_lib'
import StatusBadge from '@/components/StatusBadge'
import VisitTypeBadge from '@/components/VisitTypeBadge'
import SafetyCheckBadge from '@/components/SafetyCheckBadge'
import { SessionDetail, SessionStatus } from '@/types'

const STATUS_LABELS: Record<SessionStatus, string> = {
  in_progress: 'In Progress',
  completed: 'Completed',
  emergency_escalated: 'Emergency',
  abandoned: 'Abandoned',
}

export default function PatientHeaderCard({ sessionId, session }: { sessionId: string; session: SessionDetail }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false)
  const [targetStatus, setTargetStatus] = useState<SessionStatus | null>(null)
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false)

  const statusMutation = useMutation({
    mutationFn: (status: string) => updateSessionStatus(sessionId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session', sessionId] })
      setIsStatusModalOpen(false)
      setTargetStatus(null)
    },
  })

  return (
    <>
      <div className="glass p-6 mb-6 animate-slide-up">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-2 relative">
              <h1 className="font-display text-2xl font-semibold text-slate-800 dark:text-white">
                {session.patient?.full_name || 'Unknown'}
              </h1>
              <div className="relative">
                <button
                  onClick={() => setIsStatusMenuOpen(!isStatusMenuOpen)}
                  className="flex items-center gap-1 hover:opacity-80 transition-opacity focus:outline-none"
                >
                  <StatusBadge status={session.session_status as SessionStatus} />
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </button>
                {isStatusMenuOpen && (
                  <div className="absolute top-full left-0 mt-1 w-48 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 shadow-lg overflow-hidden z-10 py-1 animate-fade-in">
                    {(Object.keys(STATUS_LABELS) as SessionStatus[]).map((st) => (
                      <button
                        key={st}
                        onClick={() => {
                          setTargetStatus(st)
                          setIsStatusModalOpen(true)
                          setIsStatusMenuOpen(false)
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-white/5 transition-colors ${session.session_status === st ? 'text-accent-600 dark:text-accent-400 font-medium' : 'text-slate-700 dark:text-slate-300'}`}
                      >
                        {STATUS_LABELS[st]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <VisitTypeBadge visitType={session.visit_type} />
              {session.emergency_check_failed && <SafetyCheckBadge />}
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Session ID: <span className="text-slate-600 dark:text-slate-300 font-mono">{session.session_id}</span>
            </p>
          </div>
          <button onClick={() => navigate(`/session/${sessionId}/summary`)} className="btn-primary">
            <Sparkles className="h-4 w-4" />
            View AI Summary
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          <div className="rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 p-4">
            <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-400 mb-1.5">
              <User className="h-4 w-4 text-slate-400 dark:text-slate-500" />
              Patient
            </div>
            <div className="text-sm font-medium text-slate-800 dark:text-white">{session.patient?.full_name || 'Unknown'}</div>
          </div>
          <div className="rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 p-4">
            <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-400 mb-1.5">
              <Hash className="h-4 w-4 text-slate-400 dark:text-slate-500" />
              Appointment #
            </div>
            <div className="text-sm font-medium text-slate-800 dark:text-white">{session.appointment_number || '--'}</div>
          </div>
        </div>
      </div>

      {isStatusModalOpen && targetStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md border border-slate-200 dark:border-white/10 overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">Change Session Status</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                Are you sure you want to change the status of this session to{' '}
                <span className="font-semibold">{STATUS_LABELS[targetStatus]}</span>?
              </p>
              <div className="flex items-center justify-end gap-3">
                <button onClick={() => setIsStatusModalOpen(false)} disabled={statusMutation.isPending} className="btn-ghost">
                  Cancel
                </button>
                <button onClick={() => statusMutation.mutate(targetStatus)} disabled={statusMutation.isPending} className="btn-primary">
                  {statusMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Change'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
