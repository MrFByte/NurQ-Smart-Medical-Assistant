import { FormEvent, useState } from 'react'
import { Loader2, Pill, Plus, Send } from 'lucide-react'
import { usePrescriptions, useAddPrescription } from '@/hooks/usePrescriptions'
import { useAuth } from '@/context/AuthContext'

export default function PrescriptionsTab({ sessionId, active }: { sessionId: string; active: boolean }) {
  const { activeClinicianId } = useAuth()
  const { data: prescriptions = [], isLoading, isError } = usePrescriptions(sessionId, active)
  const addPrescriptionMutation = useAddPrescription(sessionId)

  const [showForm, setShowForm] = useState(false)
  const [medicationName, setMedicationName] = useState('')
  const [dosage, setDosage] = useState('')
  const [frequency, setFrequency] = useState('')
  const [duration, setDuration] = useState('')
  const [instructions, setInstructions] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!activeClinicianId || !medicationName.trim()) return
    await addPrescriptionMutation.mutateAsync({
      clinician_id: activeClinicianId,
      medication_name: medicationName.trim(),
      dosage: dosage.trim() || undefined,
      frequency: frequency.trim() || undefined,
      duration: duration.trim() || undefined,
      instructions: instructions.trim() || undefined,
    })
    setMedicationName('')
    setDosage('')
    setFrequency('')
    setDuration('')
    setInstructions('')
    setShowForm(false)
  }

  return (
    <div>
      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading prescriptions…
        </div>
      ) : isError ? (
        <div className="py-12 text-center text-red-500 text-sm">Failed to load prescriptions.</div>
      ) : prescriptions.length === 0 ? (
        <div className="py-8 text-center text-slate-400 text-sm">No prescriptions recorded yet.</div>
      ) : (
        <div className="space-y-3 mb-6">
          {prescriptions.map((rx) => (
            <div key={rx.id} className="rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 p-4">
              <div className="flex items-center gap-2 mb-1">
                <Pill className="h-4 w-4 text-accent-600 dark:text-accent-400" />
                <span className="font-medium text-slate-800 dark:text-white">{rx.medication_name}</span>
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-300 pl-6">
                {[rx.dosage, rx.frequency, rx.duration].filter(Boolean).join(' · ') || '—'}
              </div>
              {rx.instructions && <div className="text-xs text-slate-400 dark:text-slate-500 pl-6 mt-1">{rx.instructions}</div>}
            </div>
          ))}
        </div>
      )}

      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          disabled={!activeClinicianId}
          className="btn-ghost text-sm"
          title={!activeClinicianId ? 'Select a clinician first' : undefined}
        >
          <Plus className="h-4 w-4" /> Add prescription
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="border-t border-slate-200 dark:border-white/10 pt-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Medication name"
              value={medicationName}
              onChange={(e) => setMedicationName(e.target.value)}
              className="input"
              autoFocus
              required
            />
            <input type="text" placeholder="Dosage" value={dosage} onChange={(e) => setDosage(e.target.value)} className="input" />
            <input type="text" placeholder="Frequency" value={frequency} onChange={(e) => setFrequency(e.target.value)} className="input" />
            <input type="text" placeholder="Duration" value={duration} onChange={(e) => setDuration(e.target.value)} className="input" />
          </div>
          <textarea
            placeholder="Instructions (optional)"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            className="input w-full"
            rows={2}
          />
          <div className="flex items-center justify-end gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">
              Cancel
            </button>
            <button type="submit" disabled={addPrescriptionMutation.isPending || !medicationName.trim()} className="btn-primary">
              {addPrescriptionMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Save prescription
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
