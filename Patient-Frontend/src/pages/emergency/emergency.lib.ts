export const EMERGENCY_COPY = {
  heading: 'Medical Emergency Detected',
  body: 'Based on what you\'ve described, this may require immediate medical attention.',
  instructions: [
    'Please notify the front desk immediately.',
    'If you are alone, call emergency services (911).',
    'Do not wait in the general seating area.'
  ],
  cta: 'Continue to Check-In',
};

export const getEmergencyNumbers = () => {
  return [
    { label: 'Emergency Services', number: '911' },
    { label: 'Poison Control', number: '1-800-222-1222' }
  ];
};
