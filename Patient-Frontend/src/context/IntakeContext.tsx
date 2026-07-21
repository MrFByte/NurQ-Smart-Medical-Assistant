import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

const SESSION_KEY = 'nurq_intake_session';

interface IntakeState {
  patientId: string | null;
  registrationId: string | null;
  sessionId: string | null;
  appointmentNumber: string | null;
  chiefComplaint: string | null;
  isEmergency: boolean;
}

interface IntakeContextType extends IntakeState {
  setPatient: (patientId: string, registrationId: string) => void;
  setSession: (sessionId: string, appointmentNumber: string | null, chiefComplaint: string) => void;
  setEmergency: (isEmergency: boolean) => void;
  reset: () => void;
}

const initialState: IntakeState = {
  patientId: null,
  registrationId: null,
  sessionId: null,
  appointmentNumber: null,
  chiefComplaint: null,
  isEmergency: false,
};

function loadState(): IntakeState {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) return { ...initialState, ...JSON.parse(raw) };
  } catch {
    // corrupted storage — start fresh
  }
  return initialState;
}

function saveState(state: IntakeState) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
  } catch {
    // storage full or unavailable — silently ignore
  }
}

const IntakeContext = createContext<IntakeContextType | undefined>(undefined);

export const IntakeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<IntakeState>(loadState);

  // Keep sessionStorage in sync whenever state changes
  useEffect(() => {
    saveState(state);
  }, [state]);

  const setPatient = (patientId: string, registrationId: string) => {
    setState((prev) => ({ ...prev, patientId, registrationId }));
  };

  const setSession = (sessionId: string, appointmentNumber: string | null = null, chiefComplaint: string = '') => {
    setState((prev) => ({ ...prev, sessionId, appointmentNumber, chiefComplaint }));
  };

  const setEmergency = (isEmergency: boolean) => {
    setState((prev) => ({ ...prev, isEmergency }));
  };

  const reset = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setState(initialState);
  };

  return (
    <IntakeContext.Provider value={{ ...state, setPatient, setSession, setEmergency, reset }}>
      {children}
    </IntakeContext.Provider>
  );
};

export const useIntakeContext = (): IntakeContextType => {
  const context = useContext(IntakeContext);
  if (!context) {
    throw new Error('useIntakeContext must be used within an IntakeProvider');
  }
  return context;
};
