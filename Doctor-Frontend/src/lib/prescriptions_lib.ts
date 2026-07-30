import { apiClient } from './axios_config'
import { API_ENDPOINTS } from './api_mapper'
import { AddPrescriptionPayload, PrescriptionItem } from '@/types'

export const fetchPrescriptions = async (sessionId: string): Promise<PrescriptionItem[]> => {
  const { data } = await apiClient.get<PrescriptionItem[]>(API_ENDPOINTS.PRESCRIPTIONS(sessionId))
  return data
}

export const addPrescription = async (
  sessionId: string,
  payload: AddPrescriptionPayload
): Promise<PrescriptionItem> => {
  const { data } = await apiClient.post<PrescriptionItem>(API_ENDPOINTS.ADD_PRESCRIPTION(sessionId), payload)
  return data
}
