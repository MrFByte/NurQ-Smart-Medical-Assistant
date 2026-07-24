import { useMutation } from '@tanstack/react-query';
import { lookupPatient, lookupPatientByPhone } from '@/api/patient.api';
import { LookupPatientRequest, LookupByPhoneRequest, LookupPatientResponse } from '@/api/types';
import { useIntakeContext } from '@/context/IntakeContext';
import { useNavigate } from 'react-router-dom';

export const useLookupPatient = () => {
  const { setPatient } = useIntakeContext();
  const navigate = useNavigate();

  const lookupById = useMutation<LookupPatientResponse, Error, LookupPatientRequest>({
    mutationFn: lookupPatient,
    onSuccess: (data) => {
      setPatient(data.patient_id, data.registration_id);
      navigate('/complaint');
    },
  });

  const lookupByPhone = useMutation<LookupPatientResponse, Error, LookupByPhoneRequest>({
    mutationFn: lookupPatientByPhone,
    onSuccess: (data) => {
      setPatient(data.patient_id, data.registration_id);
      navigate('/complaint');
    },
  });

  return { lookupById, lookupByPhone };
};
