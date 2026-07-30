import { Loader2, ScrollText } from 'lucide-react'
import { useHistory } from '@/hooks/useHistory'

const EVENT_TYPE_LABELS: Record<string, string> = {
  surgery: 'Surgery',
  hospitalization: 'Hospitalization',
  immunization: 'Immunization',
  lab_result: 'Lab Result',
  imaging: 'Imaging',
  doctor_note: "Doctor's Note",
  diagnosis: 'Diagnosis',
  family_history: 'Family History',
  social_history: 'Social History',
  disability: 'Disability',
  other: 'Other',
}

export default function HistoryTab({ patientId, active }: { patientId: string; active: boolean }) {
  const { data: events = [], isLoading, isError } = useHistory(patientId, active)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading history…
      </div>
    )
  }

  if (isError) {
    return <div className="py-12 text-center text-red-500 text-sm">Failed to load history.</div>
  }

  if (events.length === 0) {
    return <div className="py-12 text-center text-slate-400 text-sm">No history events recorded.</div>
  }

  return (
    <div className="space-y-3">
      {events.map((event) => (
        <div key={event.id} className="rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 p-4">
          <div className="flex items-center gap-2 mb-1">
            <ScrollText className="h-4 w-4 text-accent-600 dark:text-accent-400" />
            <span className="badge bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 text-[11px]">
              {EVENT_TYPE_LABELS[event.event_type] ?? event.event_type}
            </span>
            {event.event_date && <span className="text-xs text-slate-400 dark:text-slate-500">{event.event_date}</span>}
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-300 pl-6">{event.description}</div>
        </div>
      ))}
    </div>
  )
}
