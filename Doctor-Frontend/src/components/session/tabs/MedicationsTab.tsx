import { Loader2, Pill } from 'lucide-react'
import { useMedications } from '@/hooks/useMedications'

export default function MedicationsTab({ patientId, active }: { patientId: string; active: boolean }) {
  const { data: medications = [], isLoading, isError } = useMedications(patientId, active)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading medications…
      </div>
    )
  }

  if (isError) {
    return <div className="py-12 text-center text-red-500 text-sm">Failed to load medications.</div>
  }

  const confirmedNone = medications.length === 1 && medications[0].is_confirmed_none

  if (medications.length === 0) {
    return <div className="py-12 text-center text-slate-400 text-sm">Medications have not been asked about yet.</div>
  }

  if (confirmedNone) {
    return (
      <div className="py-12 text-center text-slate-500 dark:text-slate-400 text-sm">
        Patient confirmed they are not currently taking any medications.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {medications.filter((m) => !m.is_confirmed_none).map((med) => (
        <div key={med.id} className="rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Pill className="h-4 w-4 text-accent-600 dark:text-accent-400" />
            <span className="font-medium text-slate-800 dark:text-white">{med.name}</span>
            {!med.is_currently_taking && (
              <span className="badge bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 text-[11px]">
                Not currently taking
              </span>
            )}
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-300 pl-6">
            {[med.dosage, med.frequency].filter(Boolean).join(' · ') || '—'}
          </div>
          {med.purpose && <div className="text-xs text-slate-400 dark:text-slate-500 pl-6 mt-1">For: {med.purpose}</div>}
        </div>
      ))}
    </div>
  )
}
