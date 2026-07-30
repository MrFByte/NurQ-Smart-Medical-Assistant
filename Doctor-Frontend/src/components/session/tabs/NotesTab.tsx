import { FormEvent, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Send, ShieldAlert } from 'lucide-react'
import { addSessionNote } from '@/lib/session_details_lib'
import { useAuth } from '@/context/AuthContext'
import { useClinicians } from '@/hooks/useClinicians'
import { useNotes } from '@/hooks/useNotes'
import { SessionDetail } from '@/types'

export default function NotesTab({
  sessionId, session, active,
}: {
  sessionId: string; session: SessionDetail; active: boolean
}) {
  const queryClient = useQueryClient()
  const { activeClinicianId } = useAuth()
  const { data: clinicians = [] } = useClinicians()
  const { data: notes = [], isLoading } = useNotes(sessionId, active)
  const [noteText, setNoteText] = useState('')

  const activeClinicianName = clinicians.find((c) => c.id === activeClinicianId)?.full_name

  const mutation = useMutation({
    mutationFn: (content: string) =>
      addSessionNote(sessionId, {
        content,
        note_type: 'observation',
        clinician_id: activeClinicianId ?? undefined,
        author_name: activeClinicianId ? undefined : (session.verified_by ?? 'Current Clinician'),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', sessionId] })
      setNoteText('')
    },
  })

  const handleAddNote = (e: FormEvent) => {
    e.preventDefault()
    if (!noteText.trim()) return
    mutation.mutate(noteText.trim())
  }

  return (
    <div>
      {isLoading ? (
        <div className="flex items-center justify-center py-10 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading notes…
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-10 text-slate-400 dark:text-slate-500 text-sm">
          No notes recorded yet. Add the first note below.
        </div>
      ) : (
        <div className="space-y-3 mb-6">
          {notes.map((note, idx) => (
            <div
              key={note.note_id}
              className="rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 p-4 animate-slide-up"
              style={{ animationDelay: `${idx * 40}ms` }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-accent-600 dark:text-accent-400">{note.author_name}</span>
                <span className="text-xs text-slate-400 dark:text-slate-500">Observation</span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{note.content}</p>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleAddNote} className="border-t border-slate-200 dark:border-white/10 pt-5">
        <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
          Add a note {activeClinicianName ? `as ${activeClinicianName}` : ''}
        </label>
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
  )
}
