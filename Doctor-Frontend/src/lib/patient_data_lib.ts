import { apiClient } from './axios_config'
import { API_ENDPOINTS } from './api_mapper'
import { AllergyItem, ConditionItem, HistoryEventItem, MedicationItem, VisitSummaryItem } from '@/types'

export const fetchPatientMedications = async (patientId: string): Promise<MedicationItem[]> => {
  const { data } = await apiClient.get<MedicationItem[]>(API_ENDPOINTS.PATIENT_MEDICATIONS(patientId))
  return data
}

export const fetchPatientAllergies = async (patientId: string): Promise<AllergyItem[]> => {
  const { data } = await apiClient.get<AllergyItem[]>(API_ENDPOINTS.PATIENT_ALLERGIES(patientId))
  return data
}

export const fetchPatientConditions = async (patientId: string): Promise<ConditionItem[]> => {
  const { data } = await apiClient.get<ConditionItem[]>(API_ENDPOINTS.PATIENT_CONDITIONS(patientId))
  return data
}

export const fetchPatientHistory = async (patientId: string, eventType?: string): Promise<HistoryEventItem[]> => {
  const url = eventType
    ? `${API_ENDPOINTS.PATIENT_HISTORY(patientId)}?event_type=${encodeURIComponent(eventType)}`
    : API_ENDPOINTS.PATIENT_HISTORY(patientId)
  const { data } = await apiClient.get<HistoryEventItem[]>(url)
  return data
}

export const fetchPatientVisits = async (patientId: string, excludeSessionId?: string): Promise<VisitSummaryItem[]> => {
  const url = excludeSessionId
    ? `${API_ENDPOINTS.PATIENT_VISITS(patientId)}?exclude_session_id=${excludeSessionId}`
    : API_ENDPOINTS.PATIENT_VISITS(patientId)
  const { data } = await apiClient.get<VisitSummaryItem[]>(url)
  return data
}
