import { apiClient } from './client';
import { API } from './apiMapper';
import type {
  CreateSessionRequest,
  CreateSessionResponse,
  SendMessageRequest,
  SendMessageResponse,
  ChatTurn,
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

export const getHistory = async (sessionId: string): Promise<{turns: ChatTurn[]}> => {
  const path = API.intake.getHistory.path.replace(':id', sessionId);
  const response = await apiClient.request({
    method: API.intake.getHistory.method,
    url: path,
  });
  return response.data;
};

export const sendAudioMessage = async (
  sessionId: string,
  audioBlob: Blob,
): Promise<SendMessageResponse> => {
  const path = API.intake.sendAudioMessage.path.replace(':id', sessionId);
  const form = new FormData();
  // Backend expects the field named 'audio'
  form.append('audio', audioBlob, 'audio.webm');
  const response = await apiClient.request({
    method: API.intake.sendAudioMessage.method,
    url: path,
    data: form,
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};
