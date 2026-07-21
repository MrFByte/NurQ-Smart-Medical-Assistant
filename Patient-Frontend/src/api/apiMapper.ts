export const API = {
  patient: {
    register:      { method: 'POST', path: '/patient/register' },
    lookup:        { method: 'POST', path: '/patient/lookup' },
    lookupByPhone: { method: 'POST', path: '/patient/lookup-by-phone' },
  },
  intake: {
    createSession: { method: 'POST', path: '/intake/session' },
    sendMessage:   { method: 'POST', path: '/intake/session/:id/message' },
  },
} as const;
