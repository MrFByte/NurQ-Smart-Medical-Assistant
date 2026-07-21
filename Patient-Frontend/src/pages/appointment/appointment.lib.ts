export const formatAppointmentNumber = (n: number | string | null): string => {
  if (n === null || n === undefined) return '#--';
  const num = typeof n === 'string' ? parseInt(n, 10) : n;
  if (isNaN(num)) return `#${n}`;
  return `#${num.toString().padStart(2, '0')}`;
};

export const getWaitMessage = (n: number | string | null): string => {
  if (n === null || n === undefined) return 'Please wait while we assign your appointment number.';
  return `You're ${formatAppointmentNumber(n)} in the queue today. Please take a seat in the waiting area.`;
};

export const INTAKE_PROMPT = {
  heading: 'Tell us a bit more',
  body: 'A few quick questions about your health help your doctor see you faster and prepare better care — just like filling in a form, but easier.',
  cta: 'Answer a few questions',
} as const;
