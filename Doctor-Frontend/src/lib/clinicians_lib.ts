import { apiClient } from './axios_config'
import { API_ENDPOINTS } from './api_mapper'
import { AddClinicianPayload, Clinician } from '@/types'

export const fetchClinicians = async (): Promise<Clinician[]> => {
  const { data } = await apiClient.get<Clinician[]>(API_ENDPOINTS.CLINICIANS)
  return data
}

export const addClinician = async (payload: AddClinicianPayload): Promise<Clinician> => {
  const { data } = await apiClient.post<Clinician>(API_ENDPOINTS.CLINICIANS, payload)
  return data
}
