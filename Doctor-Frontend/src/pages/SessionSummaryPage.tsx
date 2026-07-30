import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchSessionSummary } from '@/lib/session_summary_lib'
import TopBar from '@/components/TopBar'
import { ArrowLeft, Sparkles, Flag, FileText, Clock } from 'lucide-react'

export default function SessionSummaryPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: summary, isLoading, isError, error } = useQuery({
    queryKey: ['session_summary', id],
    queryFn: () => fetchSessionSummary(id!),
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center justify-center text-slate-500">
          <p>Loading AI Summary...</p>
        </div>
      </div>
    )
  }

  if (isError || !summary) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass p-8 text-center text-red-600 dark:text-danger max-w-md">
          {error instanceof Error ? error.message : 'Summary not found'}
          <div className="mt-4">
            <button onClick={() => navigate(`/session/${id}`)} className="btn-ghost">Back to session</button>
          </div>
        </div>
      </div>
    )
  }

  const generatedAtLabel = new Date(summary.generated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="min-h-screen">
      <TopBar />
      <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
        {/* Back */}
        <button onClick={() => navigate(`/session/${id}`)} className="btn-ghost mb-6 text-sm">
          <ArrowLeft className="h-4 w-4" /> Back to session
        </button>

        {/* Title */}
        <div className="flex items-center gap-3 mb-8">
          <div className="h-11 w-11 rounded-xl bg-accent/10 border border-accent/30 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-accent-600 dark:text-accent-400" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold text-slate-800 dark:text-white">AI Clinical Summary</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Session <span className="font-mono">{summary.session_id}</span>
            </p>
          </div>
        </div>

        {/* Narrative summary */}
        <div className="glass p-6 mb-6 animate-slide-up">
          <div className="flex items-center justify-between gap-2 mb-4">
            <h2 className="font-display text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
              <FileText className="h-5 w-5 text-accent-600 dark:text-accent-400" />
              Clinician Summary
            </h2>
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
              <Clock className="h-3.5 w-3.5" />
              Summary generated {generatedAtLabel}
              {summary.from_cache && ' — cached'}
            </span>
          </div>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[15px]">
            {summary.clinician_summary}
          </p>
        </div>

        {/* Flags for review */}
        <div className="glass p-6 mb-6 animate-slide-up" style={{ animationDelay: '80ms' }}>
          <h2 className="font-display text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2 mb-4">
            <Flag className="h-5 w-5 text-amber-600 dark:text-warning" />
            Flags for Review
            <span className="text-sm font-normal text-slate-400">({summary.flags_for_review.length})</span>
          </h2>
          {summary.flags_for_review.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500">No flags detected.</p>
          ) : (
            <ul className="space-y-3">
              {summary.flags_for_review.map((flag, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-3 rounded-xl bg-amber-50 dark:bg-warning/[0.07] border border-amber-300 dark:border-warning/25 px-4 py-3 animate-slide-up"
                  style={{ animationDelay: `${idx * 60}ms` }}
                >
                  <span className="mt-0.5 h-2 w-2 rounded-full bg-amber-500 dark:bg-warning shrink-0 animate-pulse-soft" />
                  <span className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">{flag}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  )
}
