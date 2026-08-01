import { API } from './apiMapper';

/**
 * Pings the backend health API silently.
 * Uses native fetch to bypass global axios interceptors which log errors to the console.
 */
export const checkHealthSilent = async (): Promise<void> => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
  fetch(`${baseUrl}${API.services.health.path}`, {
    method: API.services.health.method,
  }).catch(() => {});
};
