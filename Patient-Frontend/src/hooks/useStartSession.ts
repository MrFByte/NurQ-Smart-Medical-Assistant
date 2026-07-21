import { useMutation } from '@tanstack/react-query';
import { createSession } from '../api/intake.api';
import { CreateSessionRequest, CreateSessionResponse } from '../api/types';
import { useIntakeContext } from '../context/IntakeContext';
import { useNavigate } from 'react-router-dom';

export const useStartSession = () => {
  const { setSession, setEmergency } = useIntakeContext();
  const navigate = useNavigate();

  return useMutation<CreateSessionResponse, Error, CreateSessionRequest>({
    mutationFn: createSession,
    onSuccess: (data, variables) => {
      if (data.is_emergency) {
        setEmergency(true);
        navigate('/emergency');
        return;
      }
      setSession(
        data.session_id!,
        data.appointment_number != null ? String(data.appointment_number) : null,
        variables.chief_complaint_text
      );
    },
  });
};
