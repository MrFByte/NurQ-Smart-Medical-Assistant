import { AlertCircle, Loader2 } from 'lucide-react'
import { useAllergies } from '@/hooks/useAllergies'

export default function AllergiesTab({ patientId, active }: { patientId: string; active: boolean }) {
  const { data: allergies = [], isLoading, isError } = useAllergies(patientId, active)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading allergies…
      </div>
    )
  }

  if (isError) {
    return <div className="py-12 text-center text-red-500 text-sm">Failed to load allergies.</div>
  }

  const confirmedNone = allergies.length === 1 && allergies[0].is_confirmed_none

  if (allergies.length === 0) {
    return <div className="py-12 text-center text-slate-400 text-sm">Allergies have not been asked about yet.</div>
  }

  if (confirmedNone) {
    return (
      <div className="py-12 text-center text-slate-500 dark:text-slate-400 text-sm">
        Patient confirmed no known drug allergies (NKDA).
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {allergies.filter((a) => !a.is_confirmed_none).map((allergy) => (
        <div
          key={allergy.id}
          className="rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 p-4"
        >
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-warning" />
            <span className="font-medium text-slate-800 dark:text-white">{allergy.allergen}</span>
            {allergy.severity && (
              <span className="badge bg-amber-50 text-amber-700 border-amber-300 dark:bg-warning/15 dark:text-warning dark:border-warning/30 text-[11px]">
                {allergy.severity}
              </span>
            )}
          </div>
          {allergy.reaction && <div className="text-sm text-slate-600 dark:text-slate-300 pl-6">Reaction: {allergy.reaction}</div>}
        </div>
      ))}
    </div>
  )
}
