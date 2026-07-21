import { apiClient } from './client';
import { API } from './apiMapper';
import type {
  CreateSessionRequest,
  CreateSessionResponse,
  SendMessageRequest,
  SendMessageResponse,
} from './types';

export const createSession = async (data: CreateSessionRequest): Promise<CreateSessionResponse> => {
  const response = await apiClient.request({
    method: API.intake.createSession.method,
    url: API.intake.createSession.path,
    data,
  });
  return response.data;
};

export const sendMessage = async (sessionId: string, data: SendMessageRequest): Promise<SendMessageResponse> => {
  const path = API.intake.sendMessage.path.replace(':id', sessionId);
  const response = await apiClient.request({
    method: API.intake.sendMessage.method,
    url: path,
    data,
  });
  return response.data;
};
