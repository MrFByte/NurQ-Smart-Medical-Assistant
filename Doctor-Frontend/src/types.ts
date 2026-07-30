export interface LoginResponse {
  access_token: string
  token_type: string
}

export type SessionStatus = 'in_progress' | 'completed' | 'emergency_escalated' | 'abandoned'

export interface VisitClassificationInfo {
  code: string
  color: string
  label: string
}

export type VisitType = 'new_issue' | 'continuation' | null

export interface QueueItem {
  session_id: string
  patient_name: string | null
  registration_id: string | null
  appointment_number: number | null
  visit_classification: VisitClassificationInfo
  session_status: string
  chief_complaint: string | null
  emergency_check_failed: boolean
  visit_type: VisitType
}

export interface SessionNote {
  note_id: string | number
  session_id: string
  author_name: string
  note_type: string
  content: string
}

export interface ClinicianPatientView {
  patient_id: string | null
  registration_id: string
  full_name: string
  age: number
  gender: string
  phone_number: string
}

export interface SessionDetail {
  session_id: string
  patient: ClinicianPatientView
  appointment_number: number | null
  visit_classification: VisitClassificationInfo
  chief_complaint: string | null
  emergency_check_failed: boolean
  session_status: string
  visit_type: VisitType
  verified_by: string | null
}

export interface SessionSummary {
  session_id: string
  clinician_summary: string
  flags_for_review: string[]
  generated_at: string
  from_cache: boolean
}

// ---------------------------------------------------------------------------
// Data-layer split — per-tab reads/writes (Phase C/D)
// ---------------------------------------------------------------------------

export interface ConversationTurnItem {
  role: 'assistant' | 'user'
  content: string
  timestamp: string
}

export interface MedicationItem {
  id: string
  name: string
  dosage: string | null
  frequency: string | null
  purpose: string | null
  is_currently_taking: boolean
  is_confirmed_none: boolean
  recorded_at: string
}

export interface AllergyItem {
  id: string
  allergen: string
  reaction: string | null
  severity: string | null
  is_confirmed_none: boolean
  recorded_at: string
}

export interface ConditionItem {
  id: string
  condition_name: string
  status: string
  recorded_at: string
}

export interface HistoryEventItem {
  id: string
  event_type: string
  description: string
  event_date: string | null
  recorded_at: string
}

export interface VisitSummaryItem {
  session_id: string
  created_at: string
  chief_complaint: string | null
  visit_classification: VisitClassificationInfo
  session_status: string
  visit_type: VisitType
}

export interface PrescriptionItem {
  id: string
  session_id: string
  patient_id: string
  clinician_id: string
  medication_name: string
  dosage: string | null
  frequency: string | null
  duration: string | null
  instructions: string | null
  created_at: string
}

export interface AddPrescriptionPayload {
  clinician_id: string
  medication_name: string
  dosage?: string
  frequency?: string
  duration?: string
  instructions?: string
}

export interface Clinician {
  id: string
  full_name: string
  email: string
  specialty: string | null
  created_at: string
}

export interface AddClinicianPayload {
  full_name: string
  email: string
  specialty?: string
}
