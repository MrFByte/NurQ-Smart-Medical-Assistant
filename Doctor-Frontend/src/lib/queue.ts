import { apiClient } from './axios_config'
import { API_ENDPOINTS } from './api_mapper'
import { QueueItem } from '@/types'

export const fetchQueue = async (date?: string): Promise<QueueItem[]> => {
  const url = date ? `${API_ENDPOINTS.QUEUE}?date=${date}` : API_ENDPOINTS.QUEUE
  const { data } = await apiClient.get<QueueItem[]>(url)
  return data
}
