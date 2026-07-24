import { useMutation } from '@tanstack/react-query';
import { registerPatient } from '@/api/patient.api';
import { RegisterPatientRequest, RegisterPatientResponse } from '@/api/types';
import { useIntakeContext } from '@/context/IntakeContext';
import { useNavigate } from 'react-router-dom';

export const useRegisterPatient = () => {
  const { setPatient } = useIntakeContext();
  const navigate = useNavigate();

  return useMutation<RegisterPatientResponse, Error, RegisterPatientRequest>({
    mutationFn: registerPatient,
    onSuccess: (data) => {
      setPatient(data.patient_id, data.registration_id);
      navigate('/complaint');
    },
  });
};
