import { RegisterPatientRequest } from '../../api/types';

export const REGISTER_COPY = {
  heading: 'Patient Registration',
  subheading: 'Please fill out your details. This only takes a minute.',
  fields: {
    fullName: 'Full Name',
    phone: 'Phone Number',
    age: 'Age',
    gender: 'Gender',
  },
  submit: 'Register & Continue',
  errors: {
    fullName: 'Full name is required',
    phone: 'Valid phone number is required',
    age: 'Valid age is required',
    gender: 'Please select a gender',
  }
};

export const validateRegistrationForm = (fields: { fullName: string; phone: string; age: string; gender: string }) => {
  const errors: Record<string, string> = {};
  
  if (!fields.fullName.trim()) errors.fullName = REGISTER_COPY.errors.fullName;
  if (!fields.phone.trim() || fields.phone.length < 5) errors.phone = REGISTER_COPY.errors.phone;
  
  const ageNum = parseInt(fields.age, 10);
  if (!fields.age || isNaN(ageNum) || ageNum < 0 || ageNum > 150) errors.age = REGISTER_COPY.errors.age;
  
  if (!fields.gender) errors.gender = REGISTER_COPY.errors.gender;

  return errors;
};

export const buildRegistrationPayload = (fields: { fullName: string; phone: string; age: string; gender: string }): RegisterPatientRequest => {
  return {
    full_name: fields.fullName.trim(),
    phone_number: fields.phone.trim(),
    age: parseInt(fields.age, 10),
    gender: fields.gender,
  };
};

export const formatRegistrationId = (id: string) => {
  return `#${id}`;
};
