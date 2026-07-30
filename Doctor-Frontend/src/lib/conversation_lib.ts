import { apiClient } from './axios_config'
import { API_ENDPOINTS } from './api_mapper'
import { ConversationTurnItem } from '@/types'

export const fetchConversation = async (sessionId: string): Promise<ConversationTurnItem[]> => {
  const { data } = await apiClient.get<ConversationTurnItem[]>(API_ENDPOINTS.CONVERSATION(sessionId))
  return data
}
