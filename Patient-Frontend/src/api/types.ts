export interface LookupPatientRequest {
  registration_id: string;
}

export interface LookupByPhoneRequest {
  phone: string;
}

export interface LookupPatientResponse {
  patient_id: string;
  full_name: string;
  registration_id: string;
  last_visit_summary: string | null;
}

export interface CreateSessionRequest {
  patient_id: string;
  chief_complaint_text: string;
  disclaimer_acknowledged: boolean;
}

export interface VisitClassificationInfo {
  code: string;
  color: string;
  label: string;
}

export interface EmergencyContact {
  label: string;
  number: string;
}

export interface EmergencyAlert {
  message: string;
  emergency_contacts: EmergencyContact[];
}

export interface CreateSessionResponse {
  session_id?: string;
  appointment_number?: number;
  visit_classification?: VisitClassificationInfo;
  is_emergency: boolean;
  emergency_alert?: EmergencyAlert;
  first_question?: string;
}

export interface SendMessageRequest {
  content: string;
}

export interface ChatTurn {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export interface SendMessageResponse {
  assistant_message: string;
  session_status: 'in_progress' | 'completed' | 'emergency_escalated';
  updated_fields: string[];
  audio_url?: string | null;  // base64 MP3 data URI returned by /audio-message endpoint
}

export interface RegisterPatientRequest {
  full_name: string;
  phone_number: string;
  age: number;
  gender: string;
}

export interface RegisterPatientResponse {
  registration_id: string;
  patient_id: string;
}
