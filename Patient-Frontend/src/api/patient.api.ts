import { apiClient } from './client';
import { API } from './apiMapper';
import type {
  RegisterPatientRequest,
  RegisterPatientResponse,
  LookupPatientRequest,
  LookupByPhoneRequest,
  LookupPatientResponse,
} from './types';

export const registerPatient = async (data: RegisterPatientRequest): Promise<RegisterPatientResponse> => {
  const response = await apiClient.request({
    method: API.patient.register.method,
    url: API.patient.register.path,
    data,
  });
  return response.data;
};

export const lookupPatient = async (data: LookupPatientRequest): Promise<LookupPatientResponse> => {
  const response = await apiClient.request({
    method: API.patient.lookup.method,
    url: API.patient.lookup.path,
    data,
  });
  return response.data;
};

export const lookupPatientByPhone = async (data: LookupByPhoneRequest): Promise<LookupPatientResponse> => {
  const response = await apiClient.request({
    method: API.patient.lookupByPhone.method,
    url: API.patient.lookupByPhone.path,
    data,
  });
  return response.data;
};
