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

export interface QueueItem {
  session_id: string
  patient_name: string | null
  registration_id: string | null
  appointment_number: number | null
  visit_classification: VisitClassificationInfo
  session_status: string
  chief_complaint: string | null
}

export interface SessionNote {
  note_id: string | number
  session_id: string
  author_name: string
  note_type: string
  content: string
}

export interface ClinicianPatientView {
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
  medications: any[]
  allergies: any[]
  disabilities: any[]
  medical_findings: any[]
  pmh: Record<string, any>
  social_history: Record<string, any>
  family_history: Record<string, any>
  emergency_flags: string[]
  session_status: string
  ai_summary: string | null
  clinician_notes: SessionNote[]
  verified_by: string | null
}

export interface SessionSummary {
  session_id: string
  clinician_summary: string
  flags_for_review: string[]
  structured_data: Record<string, unknown>
}
