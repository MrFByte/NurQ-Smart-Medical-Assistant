import { apiClient } from './axios_config'
import { API_ENDPOINTS } from './api_mapper'
import { SessionSummary } from '@/types'

export const fetchSessionSummary = async (sessionId: string): Promise<SessionSummary> => {
  const { data } = await apiClient.get<SessionSummary>(API_ENDPOINTS.SESSION_SUMMARY(sessionId))
  return data
}
