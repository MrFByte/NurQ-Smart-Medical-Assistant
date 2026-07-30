import { FormEvent, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { BadgeCheck, Check, Edit3, Loader2, Stethoscope, X } from 'lucide-react'
import { verifySession } from '@/lib/session_details_lib'
import { useAuth } from '@/context/AuthContext'
import { useClinicians } from '@/hooks/useClinicians'
import { SessionDetail } from '@/types'

export default function OverviewTab({ sessionId, session }: { sessionId: string; session: SessionDetail }) {
  const queryClient = useQueryClient()
  const { activeClinicianId } = useAuth()
  const { data: clinicians = [] } = useClinicians()
  const activeClinicianName = clinicians.find((c) => c.id === activeClinicianId)?.full_name

  const [isVerifying, setIsVerifying] = useState(false)
  const [clinicianName, setClinicianName] = useState('')

  const verifyMutation = useMutation({
    mutationFn: (params: { clinicianName?: string; clinicianId?: string }) => verifySession(sessionId, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session', sessionId] })
      setIsVerifying(false)
    },
  })

  const handleVerifyWithActiveClinicianOrForm = (e: FormEvent) => {
    e.preventDefault()
    if (!clinicianName.trim()) return
    verifyMutation.mutate({ clinicianName: clinicianName.trim() })
  }

  const handleQuickVerify = () => {
    if (activeClinicianId) verifyMutation.mutate({ clinicianId: activeClinicianId })
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 p-4">
          <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-400 mb-1.5">
            <Stethoscope className="h-4 w-4 text-slate-400 dark:text-slate-500" />
            Chief Complaint
          </div>
          <div className="text-sm font-medium text-slate-800 dark:text-white">{session.chief_complaint || '--'}</div>
        </div>

        <div className="rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 p-4">
          <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-400 mb-1.5">
            <BadgeCheck className="h-4 w-4 text-slate-400 dark:text-slate-500" />
            Verified By
          </div>
          {session.verified_by ? (
            <div className="text-sm font-medium text-slate-800 dark:text-white">{session.verified_by}</div>
          ) : isVerifying ? (
            <form onSubmit={handleVerifyWithActiveClinicianOrForm} className="flex items-center gap-2 mt-1">
              <input
                type="text"
                value={clinicianName}
                onChange={(e) => setClinicianName(e.target.value)}
                placeholder="Your name"
                className="input py-1 px-2 text-sm w-full"
                autoFocus
              />
              <button type="submit" disabled={verifyMutation.isPending} className="p-1 rounded-md bg-accent-100 text-accent-700 dark:bg-accent-500/20 dark:text-accent-400 hover:bg-accent-200 transition-colors">
                {verifyMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              </button>
              <button type="button" onClick={() => setIsVerifying(false)} className="p-1 rounded-md text-slate-400 hover:text-slate-600 transition-colors">
                <X className="h-3 w-3" />
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-2">
              <div className="text-sm font-medium text-amber-600 dark:text-warning">Unverified</div>
              {activeClinicianId ? (
                <button
                  onClick={handleQuickVerify}
                  disabled={verifyMutation.isPending}
                  className="text-xs text-accent-600 dark:text-accent-400 hover:underline"
                >
                  {verifyMutation.isPending ? 'Verifying…' : `Verify as ${activeClinicianName}`}
                </button>
              ) : (
                <button
                  onClick={() => setIsVerifying(true)}
                  className="text-slate-400 hover:text-accent-600 transition-colors p-1 rounded-md"
                  title="Verify Session"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
