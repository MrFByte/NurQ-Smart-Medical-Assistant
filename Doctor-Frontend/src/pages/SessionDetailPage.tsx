import { useState, FormEvent } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchSessionDetail, addSessionNote, updateSessionStatus, verifySession } from '@/lib/session_details_lib'
import { SessionNote, SessionStatus } from '@/types'
import StatusBadge from '@/components/StatusBadge'
import TopBar from '@/components/TopBar'
import {
  ArrowLeft, User, Hash, Stethoscope, BadgeCheck, Sparkles,
  Send, MessageSquare, ShieldAlert, Loader2, Activity, Edit3, X, Check, ChevronDown
} from 'lucide-react'

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  
  const { data: session, isLoading, isError, error } = useQuery({
    queryKey: ['session', id],
    queryFn: () => fetchSessionDetail(id!),
    enabled: !!id,
  })

  const [noteText, setNoteText] = useState('')
  
  // Verification State
  const [isVerifying, setIsVerifying] = useState(false)
  const [clinicianName, setClinicianName] = useState('')

  // Status Change State
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false)
  const [targetStatus, setTargetStatus] = useState<SessionStatus | null>(null)
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false)

  const mutation = useMutation({
    mutationFn: (noteData: { content: string; author_name: string; note_type: string }) =>
      addSessionNote(id!, noteData),
    onSuccess: () => {
      // Refresh the session data to show the new note
      queryClient.invalidateQueries({ queryKey: ['session', id] })
      setNoteText('')
    },
  })

  const handleAddNote = (e: FormEvent) => {
    e.preventDefault()
    if (!noteText.trim() || !id || !session) return
    const author_name = session.verified_by ?? 'Current Clinician'
    mutation.mutate({
      content: noteText.trim(),
      author_name,
      note_type: 'observation',
    })
  }

  const verifyMutation = useMutation({
    mutationFn: (name: string) => verifySession(id!, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session', id] })
      setIsVerifying(false)
    },
  })

  const handleVerify = (e: FormEvent) => {
    e.preventDefault()
    if (!clinicianName.trim()) return
    verifyMutation.mutate(clinicianName.trim())
  }

  const statusMutation = useMutation({
    mutationFn: (status: string) => updateSessionStatus(id!, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session', id] })
      setIsStatusModalOpen(false)
      setTargetStatus(null)
    },
  })

  const confirmStatusChange = () => {
    if (targetStatus) {
      statusMutation.mutate(targetStatus)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center justify-center text-slate-500">
          <Activity className="h-8 w-8 animate-spin mb-4 text-accent-500" />
          <p>Loading session details...</p>
        </div>
      </div>
    )
  }

  if (isError || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass p-8 text-center text-red-600 dark:text-danger max-w-md">
          {error instanceof Error ? error.message : 'Session not found'}
          <div className="mt-4">
            <Link to="/queue" className="btn-ghost">Back to queue</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <TopBar />
      <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
        {/* Back */}
        <button onClick={() => navigate('/queue')} className="btn-ghost mb-6 text-sm">
          <ArrowLeft className="h-4 w-4" /> Back to queue
        </button>

        {/* Session header card */}
        <div className="glass p-6 mb-6 animate-slide-up">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2 relative">
                <h1 className="font-display text-2xl font-semibold text-slate-800 dark:text-white">{session.patient?.full_name || 'Unknown'}</h1>
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
                      {(['in_progress', 'completed', 'emergency_escalated', 'abandoned'] as SessionStatus[]).map((st) => (
                        <button
                          key={st}
                          onClick={() => {
                            setTargetStatus(st)
                            setIsStatusModalOpen(true)
                            setIsStatusMenuOpen(false)
                          }}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-white/5 transition-colors ${session.session_status === st ? 'text-accent-600 dark:text-accent-400 font-medium' : 'text-slate-700 dark:text-slate-300'}`}
                        >
                          {st === 'in_progress' ? 'In Progress' : st === 'completed' ? 'Completed' : st === 'emergency_escalated' ? 'Emergency' : 'Abandoned'}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                Session ID: <span className="text-slate-600 dark:text-slate-300 font-mono">{session.session_id}</span>
              </p>
            </div>
            <button onClick={() => navigate(`/session/${id}/summary`)} className="btn-primary">
              <Sparkles className="h-4 w-4" />
              View AI Summary
            </button>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            <InfoTile icon={<User className="h-4 w-4" />} label="Patient" value={session.patient?.full_name || 'Unknown'} />
            <InfoTile icon={<Hash className="h-4 w-4" />} label="Appointment #" value={String(session.appointment_number || '--')} />
            <InfoTile icon={<Stethoscope className="h-4 w-4" />} label="Chief Complaint" value={session.chief_complaint || '--'} />
            <div className="rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 p-4">
              <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-400 mb-1.5">
                <BadgeCheck className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                Verified By
              </div>
              {session.verified_by ? (
                <div className="text-sm font-medium text-slate-800 dark:text-white">
                  {session.verified_by}
                </div>
              ) : isVerifying ? (
                <form onSubmit={handleVerify} className="flex items-center gap-2 mt-1">
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
                  <div className="text-sm font-medium text-amber-600 dark:text-warning">
                    Unverified
                  </div>
                  <button 
                    onClick={() => setIsVerifying(true)}
                    className="text-slate-400 hover:text-accent-600 transition-colors p-1 rounded-md"
                    title="Verify Session"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Notes section */}
        <div className="glass p-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
          <h2 className="font-display text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2 mb-5">
            <MessageSquare className="h-5 w-5 text-accent-600 dark:text-accent-400" />
            Clinical Notes
            <span className="text-sm font-normal text-slate-400">({session.clinician_notes.length})</span>
          </h2>

          {/* Notes list */}
          {session.clinician_notes.length === 0 ? (
            <div className="text-center py-10 text-slate-400 dark:text-slate-500 text-sm">
              No notes recorded yet. Add the first note below.
            </div>
          ) : (
            <div className="space-y-3 mb-6">
              {session.clinician_notes.map((note: SessionNote, idx: number) => (
                <div
                  key={note.note_id}
                  className="rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 p-4 animate-slide-up"
                  style={{ animationDelay: `${idx * 40}ms` }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-accent-600 dark:text-accent-400">{note.author_name}</span>
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      Observation
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{note.content}</p>
                </div>
              ))}
            </div>
          )}

          {/* Add note form */}
          <form onSubmit={handleAddNote} className="border-t border-slate-200 dark:border-white/10 pt-5">
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Add a note</label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Write your clinical observation…"
                className="input flex-1"
                disabled={mutation.isPending}
              />
              <button type="submit" disabled={mutation.isPending || !noteText.trim()} className="btn-primary sm:px-6">
                {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Add note
              </button>
            </div>
            {!session.verified_by && (
              <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-warning/80 mt-3">
                <ShieldAlert className="h-3.5 w-3.5" />
                This session is unverified — notes require attending sign-off.
              </p>
            )}
          </form>
        </div>
      </main>

      {/* Status Confirmation Modal */}
      {isStatusModalOpen && targetStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md border border-slate-200 dark:border-white/10 overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">Change Session Status</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                Are you sure you want to change the status of this session to <span className="font-semibold">{targetStatus === 'completed' ? 'Completed' : targetStatus === 'in_progress' ? 'In Progress' : targetStatus === 'emergency_escalated' ? 'Emergency' : 'Abandoned'}</span>?
              </p>
              <div className="flex items-center justify-end gap-3">
                <button 
                  onClick={() => setIsStatusModalOpen(false)}
                  disabled={statusMutation.isPending}
                  className="btn-ghost"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmStatusChange}
                  disabled={statusMutation.isPending}
                  className="btn-primary"
                >
                  {statusMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Change'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

function InfoTile({
  icon, label, value, danger,
}: {
  icon: React.ReactNode; label: string; value: string; danger?: boolean
}) {
  return (
    <div className="rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 p-4">
      <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-400 mb-1.5">
        <span className="text-slate-400 dark:text-slate-500">{icon}</span>
        {label}
      </div>
      <div className={`text-sm font-medium ${danger ? 'text-amber-600 dark:text-warning' : 'text-slate-800 dark:text-white'}`}>
        {value}
      </div>
    </div>
  )
}
