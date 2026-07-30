import { FormEvent, useEffect, useState } from 'react'
import { ChevronDown, Loader2, Plus, Stethoscope, X } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useAddClinician, useClinicians } from '@/hooks/useClinicians'

export default function ClinicianSelector() {
  const { activeClinicianId, setActiveClinicianId } = useAuth()
  const { data: clinicians = [], isLoading } = useClinicians()
  const addClinicianMutation = useAddClinician()

  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [specialty, setSpecialty] = useState('')

  const activeClinician = clinicians.find((c) => c.id === activeClinicianId) ?? null

  // If the persisted clinician id no longer exists (e.g. different DB), clear it.
  useEffect(() => {
    if (!isLoading && activeClinicianId && clinicians.length > 0 && !activeClinician) {
      setActiveClinicianId(null)
    }
  }, [isLoading, activeClinicianId, clinicians.length, activeClinician, setActiveClinicianId])

  const handleAddClinician = async (e: FormEvent) => {
    e.preventDefault()
    if (!fullName.trim() || !email.trim()) return
    const clinician = await addClinicianMutation.mutateAsync({
      full_name: fullName.trim(),
      email: email.trim(),
      specialty: specialty.trim() || undefined,
    })
    setActiveClinicianId(clinician.id)
    setFullName('')
    setEmail('')
    setSpecialty('')
    setIsModalOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsMenuOpen((v) => !v)}
        className="btn-ghost text-sm flex items-center gap-1.5"
      >
        <Stethoscope className="h-4 w-4" />
        <span className="hidden sm:inline">
          You are: {activeClinician ? activeClinician.full_name : 'Select clinician'}
        </span>
        <ChevronDown className="h-3.5 w-3.5" />
      </button>

      {isMenuOpen && (
        <div className="absolute top-full right-0 mt-1 w-64 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 shadow-lg overflow-hidden z-20 py-1 animate-fade-in">
          {isLoading ? (
            <div className="px-4 py-3 text-sm text-slate-400 flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading clinicians…
            </div>
          ) : clinicians.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-400">No clinicians yet.</div>
          ) : (
            clinicians.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setActiveClinicianId(c.id)
                  setIsMenuOpen(false)
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-white/5 transition-colors ${c.id === activeClinicianId ? 'text-accent-600 dark:text-accent-400 font-medium' : 'text-slate-700 dark:text-slate-300'}`}
              >
                {c.full_name}
                {c.specialty && <span className="text-xs text-slate-400 ml-1.5">({c.specialty})</span>}
              </button>
            ))
          )}
          <div className="border-t border-slate-200 dark:border-white/10 mt-1 pt-1">
            <button
              onClick={() => {
                setIsMenuOpen(false)
                setIsModalOpen(true)
              }}
              className="w-full text-left px-4 py-2 text-sm text-accent-600 dark:text-accent-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" /> Add clinician
            </button>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-sm border border-slate-200 dark:border-white/10 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Add clinician</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <form onSubmit={handleAddClinician} className="space-y-3">
                <input
                  type="text"
                  placeholder="Full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input w-full"
                  autoFocus
                  required
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input w-full"
                  required
                />
                <input
                  type="text"
                  placeholder="Specialty (optional)"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  className="input w-full"
                />
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="btn-ghost">
                    Cancel
                  </button>
                  <button type="submit" disabled={addClinicianMutation.isPending} className="btn-primary">
                    {addClinicianMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
