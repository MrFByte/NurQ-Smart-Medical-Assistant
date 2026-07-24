export const API_ENDPOINTS = {
  QUEUE: '/clinician/queue',
  SESSION_DETAIL: (sessionId: string) => `/clinician/session/${sessionId}`,
  ADD_NOTE: (sessionId: string) => `/clinician/session/${sessionId}/note`,
  SESSION_SUMMARY: (sessionId: string) => `/clinician/session/${sessionId}/summary`,
}
