import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchSessionDetail } from '@/lib/session_details_lib'
import TopBar from '@/components/TopBar'
import TabBar from '@/components/TabBar'
import PatientHeaderCard from '@/components/session/PatientHeaderCard'
import OverviewTab from '@/components/session/tabs/OverviewTab'
import MedicationsTab from '@/components/session/tabs/MedicationsTab'
import AllergiesTab from '@/components/session/tabs/AllergiesTab'
import ConditionsTab from '@/components/session/tabs/ConditionsTab'
import HistoryTab from '@/components/session/tabs/HistoryTab'
import ConversationTab from '@/components/session/tabs/ConversationTab'
import PastVisitsTab from '@/components/session/tabs/PastVisitsTab'
import PrescriptionsTab from '@/components/session/tabs/PrescriptionsTab'
import NotesTab from '@/components/session/tabs/NotesTab'
import {
  ArrowLeft, Activity, ClipboardList, Pill, AlertCircle, HeartPulse,
  ScrollText, MessageCircle, History, Stethoscope, FileText,
} from 'lucide-react'

const TABS = [
  { key: 'overview', label: 'Overview', icon: <ClipboardList className="h-4 w-4" /> },
  { key: 'medications', label: 'Medications', icon: <Pill className="h-4 w-4" /> },
  { key: 'allergies', label: 'Allergies', icon: <AlertCircle className="h-4 w-4" /> },
  { key: 'conditions', label: 'Conditions', icon: <HeartPulse className="h-4 w-4" /> },
  { key: 'history', label: 'History', icon: <ScrollText className="h-4 w-4" /> },
  { key: 'conversation', label: 'Conversation', icon: <MessageCircle className="h-4 w-4" /> },
  { key: 'visits', label: 'Past Visits', icon: <History className="h-4 w-4" /> },
  { key: 'prescriptions', label: 'Prescriptions', icon: <Stethoscope className="h-4 w-4" /> },
  { key: 'notes', label: 'Notes', icon: <FileText className="h-4 w-4" /> },
]

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')

  const { data: session, isLoading, isError, error } = useQuery({
    queryKey: ['session', id],
    queryFn: () => fetchSessionDetail(id!),
    enabled: !!id,
  })

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

  if (isError || !session || !id) {
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

  const patientId = session.patient?.patient_id ?? undefined

  return (
    <div className="min-h-screen">
      <TopBar />
      <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
        <button onClick={() => navigate('/queue')} className="btn-ghost mb-6 text-sm">
          <ArrowLeft className="h-4 w-4" /> Back to queue
        </button>

        <PatientHeaderCard sessionId={id} session={session} />

        <div className="glass p-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
          <TabBar tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

          {activeTab === 'overview' && <OverviewTab sessionId={id} session={session} />}
          {activeTab === 'medications' && patientId && <MedicationsTab patientId={patientId} active={activeTab === 'medications'} />}
          {activeTab === 'allergies' && patientId && <AllergiesTab patientId={patientId} active={activeTab === 'allergies'} />}
          {activeTab === 'conditions' && patientId && <ConditionsTab patientId={patientId} active={activeTab === 'conditions'} />}
          {activeTab === 'history' && patientId && <HistoryTab patientId={patientId} active={activeTab === 'history'} />}
          {activeTab === 'conversation' && <ConversationTab sessionId={id} active={activeTab === 'conversation'} />}
          {activeTab === 'visits' && patientId && (
            <PastVisitsTab patientId={patientId} currentSessionId={id} active={activeTab === 'visits'} />
          )}
          {activeTab === 'prescriptions' && <PrescriptionsTab sessionId={id} active={activeTab === 'prescriptions'} />}
          {activeTab === 'notes' && <NotesTab sessionId={id} session={session} active={activeTab === 'notes'} />}
          {['medications', 'allergies', 'conditions', 'history', 'visits'].includes(activeTab) && !patientId && (
            <div className="py-12 text-center text-slate-400 text-sm">This session has no linked patient record.</div>
          )}
        </div>
      </main>
    </div>
  )
}
