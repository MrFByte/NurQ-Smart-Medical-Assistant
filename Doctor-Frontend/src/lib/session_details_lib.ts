import { apiClient } from './axios_config'
import { API_ENDPOINTS } from './api_mapper'
import { SessionDetail, SessionNote } from '@/types'

export const fetchSessionDetail = async (sessionId: string): Promise<SessionDetail> => {
  const { data } = await apiClient.get<SessionDetail>(API_ENDPOINTS.SESSION_DETAIL(sessionId))
  return data
}

export interface AddNotePayload {
  author_name: string
  note_type: string
  content: string
}

export const addSessionNote = async (sessionId: string, payload: AddNotePayload): Promise<SessionNote> => {
  const { data } = await apiClient.post<SessionNote>(API_ENDPOINTS.ADD_NOTE(sessionId), payload)
  return data
}

export const updateSessionStatus = async (sessionId: string, status: string): Promise<void> => {
  await apiClient.patch(API_ENDPOINTS.STATUS(sessionId), { status })
}

export const verifySession = async (sessionId: string, clinicianName: string): Promise<void> => {
  await apiClient.post(API_ENDPOINTS.VERIFY(sessionId), { clinician_name: clinicianName })
}

