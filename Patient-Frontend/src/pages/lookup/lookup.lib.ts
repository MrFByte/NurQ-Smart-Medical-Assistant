export const LOOKUP_COPY = {
  heading: 'Returning Patient',
  subheading: 'Welcome back. Let\'s find your records.',
  tabs: {
    id: 'Registration ID',
    phone: 'Phone Number',
  },
  idMode: {
    label: 'Registration ID',
    placeholder: 'e.g. A42',
    error: 'Please enter a valid Registration ID',
  },
  phoneMode: {
    label: 'Phone Number',
    placeholder: '(555) 000-0000',
    error: 'Please enter a valid Phone Number',
  },
  submit: 'Look Up Record',
};

export const normalizeRegistrationId = (input: string): string => {
  return input.toUpperCase().replace(/\s+/g, '').replace(/^#/, '');
};

export const normalizePhone = (input: string): string => {
  return input.replace(/\D/g, '');
};

export const validateLookupInput = (mode: 'id' | 'phone', value: string): boolean => {
  if (mode === 'id') {
    const normalized = normalizeRegistrationId(value);
    return normalized.length >= 2;
  } else {
    const normalized = normalizePhone(value);
    return normalized.length >= 5;
  }
};
