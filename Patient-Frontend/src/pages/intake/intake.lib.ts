import { SendMessageRequest } from '../../api/types';

export const INTAKE_COPY = {
  header: 'Nurq Health Assistant',
  subHeader: 'Online · Here to help',
  typeMode: 'Type',
  speakMode: 'Speak',
  status: {
    idle: 'Tap the mic to start speaking',
    listening: 'We\'re listening... tap to stop',
    processing: 'Processing...',
  },
  micHint: 'Tap to speak again',
  placeholder: 'Type your message...',
};

export const buildMessagePayload = (content: string): SendMessageRequest => {
  return {
    content: content.trim(),
  };
};

export const isSessionComplete = (status: string): boolean => status === 'completed';
export const isSessionEmergency = (status: string): boolean => status === 'emergency_escalated';

// Re-using the SpeechRecognition types from complaint.lib.ts
export const initSpeechRecognition = (
  onInterim: (text: string) => void,
  onFinal: (text: string) => void,
  onEnd: () => void
): any | null => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (!SpeechRecognition) return null;

  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  recognition.onresult = (event: any) => {
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

  recognition.onend = onEnd;
  recognition.onerror = (event: any) => {
    console.error('Speech recognition error', event.error);
    onEnd();
  };

  return recognition;
};
