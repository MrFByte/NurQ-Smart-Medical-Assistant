import {
  LoginResponse,
  QueueItem,
  SessionDetail,
  SessionSummary,
  SessionNote,
} from './types'

export const mockLogin = (username: string, password: string): LoginResponse => {
  if (!username || !password) throw new Error('Username and password are required')
  return {
    access_token: 'mock.jwt.' + btoa(username + ':' + Date.now()),
    token_type: 'bearer',
  }
}

export const mockQueue: QueueItem[] = [
  {
    session_id: 'sess-001',
    patient_id: 'pat-101',
    full_name: 'Eleanor Whitfield',
    appointment_number: 1,
    chief_complaint: 'Persistent chest tightness over 3 days',
    status: 'in_progress',
    created_at: '2026-07-15T08:00:00Z',
  },
  {
    session_id: 'sess-002',
    patient_id: 'pat-102',
    full_name: 'Marcus Delacroix',
    appointment_number: 2,
    chief_complaint: 'Post-operative knee pain follow-up',
    status: 'completed',
    created_at: '2026-07-15T08:30:00Z',
  },
  {
    session_id: 'sess-003',
    patient_id: 'pat-103',
    full_name: 'Priya Raghunathan',
    appointment_number: 3,
    chief_complaint: 'Acute migraine with visual aura',
    status: 'emergency_escalated',
    created_at: '2026-07-15T09:00:00Z',
  },
  {
    session_id: 'sess-004',
    patient_id: 'pat-104',
    full_name: 'Hiroshi Tanaka',
    appointment_number: 4,
    chief_complaint: 'Routine annual physical examination',
    status: 'in_progress',
    created_at: '2026-07-15T09:30:00Z',
  },
  {
    session_id: 'sess-005',
    patient_id: 'pat-105',
    full_name: 'Amara Okafor',
    appointment_number: 5,
    chief_complaint: 'Fatigue and unexplained weight loss',
    status: 'completed',
    created_at: '2026-07-15T10:00:00Z',
  },
]

const notesBySession: Record<string, SessionNote[]> = {
  'sess-001': [
    {
      id: 'note-1',
      author: 'Dr. Aldous Huxley',
      content:
        'Patient reports intermittent chest tightness, no radiation. Vitals stable. ECG pending.',
      created_at: '2026-07-15T08:05:00Z',
    },
    {
      id: 'note-2',
      author: 'Dr. Aldous Huxley',
      content: 'Troponin negative. Scheduling stress test for next visit.',
      created_at: '2026-07-15T08:20:00Z',
    },
  ],
  'sess-002': [
    {
      id: 'note-3',
      author: 'Dr. Sofia Reyes',
      content: 'Knee flexion improved to 110°. Recommend continuing physical therapy 2x/week.',
      created_at: '2026-07-15T08:35:00Z',
    },
  ],
  'sess-003': [
    {
      id: 'note-4',
      author: 'Dr. Sofia Reyes',
      content:
        'Escalated to ER — patient experiencing aphasia alongside migraine. Neurology consult requested.',
      created_at: '2026-07-15T09:02:00Z',
    },
  ],
  'sess-005': [
    {
      id: 'note-5',
      author: 'Dr. Aldous Huxley',
      content: 'Ordered CBC, TSH, and metabolic panel. Follow-up in 2 weeks.',
      created_at: '2026-07-15T10:10:00Z',
    },
  ],
}

const sessionsById: Record<string, SessionDetail> = {
  'sess-001': {
    session_id: 'sess-001',
    patient_id: 'pat-101',
    full_name: 'Eleanor Whitfield',
    appointment_number: 1,
    chief_complaint: 'Persistent chest tightness over 3 days',
    status: 'in_progress',
    verified_by: 'Dr. Aldous Huxley',
    notes: notesBySession['sess-001'] ?? [],
  },
  'sess-002': {
    session_id: 'sess-002',
    patient_id: 'pat-102',
    full_name: 'Marcus Delacroix',
    appointment_number: 2,
    chief_complaint: 'Post-operative knee pain follow-up',
    status: 'completed',
    verified_by: 'Dr. Sofia Reyes',
    notes: notesBySession['sess-002'] ?? [],
  },
  'sess-003': {
    session_id: 'sess-003',
    patient_id: 'pat-103',
    full_name: 'Priya Raghunathan',
    appointment_number: 3,
    chief_complaint: 'Acute migraine with visual aura',
    status: 'emergency_escalated',
    verified_by: null,
    notes: notesBySession['sess-003'] ?? [],
  },
  'sess-004': {
    session_id: 'sess-004',
    patient_id: 'pat-104',
    full_name: 'Hiroshi Tanaka',
    appointment_number: 4,
    chief_complaint: 'Routine annual physical examination',
    status: 'in_progress',
    verified_by: null,
    notes: [],
  },
  'sess-005': {
    session_id: 'sess-005',
    patient_id: 'pat-105',
    full_name: 'Amara Okafor',
    appointment_number: 5,
    chief_complaint: 'Fatigue and unexplained weight loss',
    status: 'completed',
    verified_by: 'Dr. Aldous Huxley',
    notes: notesBySession['sess-005'] ?? [],
  },
}

const summariesById: Record<string, SessionSummary> = {
  'sess-001': {
    session_id: 'sess-001',
    clinician_summary:
      'Patient is a 58-year-old female presenting with a 3-day history of intermittent, non-radiating chest tightness without exertional pattern. Initial cardiac workup (ECG, troponin) was negative for acute ischemia. Symptoms are consistent with atypical angina; a cardiac stress test has been scheduled to rule out inducible ischemia. Patient was counseled on warning signs and advised to seek emergency care if symptoms worsen or occur at rest.',
    flags_for_review: [
      'Patient has a family history of premature CAD — consider lipid panel',
      'Chest tightness at rest reported once — monitor for unstable angina',
      'Stress test not yet scheduled — confirm appointment with cardiology',
    ],
    structured_data: {
      age: 58,
      sex: 'F',
      blood_pressure_mmHg: '128/82',
      heart_rate_bpm: 76,
      spo2_pct: 98,
      ecg_result: 'sinus rhythm, no ST changes',
      troponin_ng_ml: 0.01,
      assessment: 'atypical angina, low-risk stratification pending',
      plan: 'stress test within 7 days, lifestyle counseling',
    },
  },
  'sess-002': {
    session_id: 'sess-002',
    clinician_summary:
      'Patient is a 42-year-old male status post arthroscopic meniscectomy 6 weeks ago. Knee range of motion has improved to 110° flexion with minimal discomfort. Physical therapy is progressing well. No effusion or instability noted on examination. Cleared to advance to sport-specific rehabilitation.',
    flags_for_review: [
      'Patient reports occasional clicking — confirm no meniscal remnant',
      'PT frequency may be reduced to 1x/week if progress continues',
    ],
    structured_data: {
      age: 42,
      sex: 'M',
      surgery: 'arthroscopic meniscectomy',
      weeks_postop: 6,
      flexion_deg: 110,
      extension_deficit_deg: 0,
      effusion: 'none',
      assessment: 'on-expected recovery trajectory',
      plan: 'advance to sport-specific rehab, follow-up in 4 weeks',
    },
  },
  'sess-003': {
    session_id: 'sess-003',
    clinician_summary:
      'Patient is a 35-year-old female presenting with acute migraine accompanied by visual aura and new-onset expressive aphasia. Given the neurological deficit, the patient was escalated to the emergency department for urgent neuroimaging to rule out stroke or TIA. Neurology consult has been requested. Session is pending verification pending ED workup.',
    flags_for_review: [
      'Aphasia is a red flag — confirm CT/MRI completed in ED',
      'No prior migraine history — consider secondary causes',
      'Verified_by is null — requires attending sign-off',
    ],
    structured_data: {
      age: 35,
      sex: 'F',
      blood_pressure_mmHg: '142/88',
      heart_rate_bpm: 92,
      neuro_deficit: 'expressive aphasia',
      imaging_status: 'pending',
      assessment: 'acute migraine vs TIA — rule out stroke',
      plan: 'urgent CT head, neurology consult, ED observation',
    },
  },
  'sess-004': {
    session_id: 'sess-004',
    clinician_summary:
      'Patient is a 50-year-old male presenting for routine annual physical. Overall health is good with no active complaints. All screening labs ordered. Lifestyle counseling provided regarding diet and exercise. Vaccinations are up to date.',
    flags_for_review: [
      'Colonoscopy screening overdue — patient has not completed',
      'Family history of hypertension — monitor BP trends',
    ],
    structured_data: {
      age: 50,
      sex: 'M',
      blood_pressure_mmHg: '118/76',
      heart_rate_bpm: 64,
      spo2_pct: 99,
      bmi: 24.1,
      assessment: 'healthy adult, preventive visit',
      plan: 'routine labs, colonoscopy referral, follow-up in 1 year',
    },
  },
  'sess-005': {
    session_id: 'sess-005',
    clinician_summary:
      'Patient is a 47-year-old female presenting with 2-month history of fatigue and 8-pound unintentional weight loss. Initial workup including CBC, TSH, and comprehensive metabolic panel has been ordered. No obvious red flags on initial exam, but symptoms warrant investigation for thyroid dysfunction, anemia, and metabolic causes. Follow-up scheduled in 2 weeks to review labs.',
    flags_for_review: [
      'Unintentional weight loss >5% body weight — consider malignancy workup if labs unrevealing',
      'Patient reports night sweats — further history needed',
      'TSH result pending — confirm follow-up appointment',
    ],
    structured_data: {
      age: 47,
      sex: 'F',
      blood_pressure_mmHg: '116/74',
      heart_rate_bpm: 70,
      weight_loss_lbs: 8,
      duration_weeks: 8,
      labs_ordered: ['CBC', 'TSH', 'CMP'],
      assessment: 'unexplained weight loss — workup initiated',
      plan: 'review labs in 2 weeks, consider imaging if persistent',
    },
  },
}

export function getMockQueue(): QueueItem[] {
  return [...mockQueue]
}

export function getMockSession(id: string): SessionDetail {
  const s = sessionsById[id]
  if (!s) throw new Error('Session not found')
  return { ...s, notes: [...s.notes] }
}

export function addMockNote(
  sessionId: string,
  content: string,
  author: string,
): SessionNote {
  const s = sessionsById[sessionId]
  if (!s) throw new Error('Session not found')
  const note: SessionNote = {
    id: 'note-' + Date.now(),
    author,
    content,
    created_at: new Date().toISOString(),
  }
  s.notes.push(note)
  return note
}

export function getMockSummary(id: string): SessionSummary {
  const s = summariesById[id]
  if (!s) throw new Error('Summary not found')
  return { ...s, flags_for_review: [...s.flags_for_review], structured_data: { ...s.structured_data } }
}
