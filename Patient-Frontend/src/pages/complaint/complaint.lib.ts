import { CreateSessionRequest } from '../../api/types';

export const COMPLAINT_COPY = {
  heading: 'Reason for Visit',
  subheading: 'In a few words, what brings you in today?',
  placeholder: 'e.g., I have had a severe headache since yesterday morning...',
  disclaimer: 'By continuing, you agree this is not a substitute for emergency services.',
  typeMode: 'Type',
  speakMode: 'Speak',
  status: {
    idle: 'Tap the mic to start speaking',
    listening: 'Listening... speak now',
    processing: 'Processing...',
  },
  submitText: 'Continue',
  micTitle: 'Speak your symptoms',
  micHint: 'Tap to speak again',
};

export const EMERGENCY_KEYWORDS = [
  'chest pain', 'heart attack', 'stroke', 'bleeding heavily',
  'can\'t breathe', 'difficulty breathing', 'suicide', 'kill myself',
  'unconscious', 'passed out', 'seizure'
];

export const isEmergency = (text: string): boolean => {
  const lowerText = text.toLowerCase();
  return EMERGENCY_KEYWORDS.some(keyword => lowerText.includes(keyword));
};

export const buildSessionPayload = (patientId: string, complaint: string): CreateSessionRequest => {
  return {
    patient_id: patientId,
    chief_complaint_text: complaint.trim(),
    disclaimer_acknowledged: true, // Always true for POC
  };
};

// Web Speech API Types
interface SpeechRecognitionEvent {
  resultIndex: number;
  results: {
    length: number;
    item(index: number): {
      isFinal: boolean;
      item(index: number): { transcript: string };
      [index: number]: { transcript: string };
    };
    [index: number]: {
      isFinal: boolean;
      item(index: number): { transcript: string };
      [index: number]: { transcript: string };
    };
  };
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
}

declare global {
  interface Window {
    SpeechRecognition?: {
      new (): SpeechRecognition;
    };
    webkitSpeechRecognition?: {
      new (): SpeechRecognition;
    };
  }
}

export const initSpeechRecognition = (
  onInterim: (text: string) => void,
  onFinal: (text: string) => void,
  onEnd: () => void
): SpeechRecognition | null => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    return null;
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  recognition.onresult = (event) => {
    let interimTranscript = '';
    let finalTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript;
      } else {
        interimTranscript += event.results[i][0].transcript;
      }
    }
    
    if (finalTranscript) onFinal(finalTranscript);
    if (interimTranscript) onInterim(interimTranscript);
  };

  recognition.onend = () => {
    onEnd();
  };

  recognition.onerror = (event) => {
    console.error('Speech recognition error', event.error);
    onEnd();
  };

  return recognition;
};
