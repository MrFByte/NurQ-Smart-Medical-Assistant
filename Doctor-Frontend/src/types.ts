export interface LoginResponse {
  access_token: string
  token_type: string
}

export type SessionStatus = 'in_progress' | 'completed' | 'emergency_escalated'

export interface QueueItem {
  session_id: string
  patient_id: string
  full_name: string
  appointment_number: number
  chief_complaint: string
  status: SessionStatus
  created_at: string
}

export interface SessionNote {
  id: string
  author: string
  content: string
  created_at: string
}

export interface SessionDetail {
  session_id: string
  patient_id: string
  full_name: string
  appointment_number: number
  chief_complaint: string
  status: SessionStatus
  verified_by: string | null
  notes: SessionNote[]
}

export interface SessionSummary {
  session_id: string
  clinician_summary: string
  flags_for_review: string[]
  structured_data: Record<string, unknown>
}
