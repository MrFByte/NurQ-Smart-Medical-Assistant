import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { sendMessage } from '../api/intake.api';
import { SendMessageRequest, SendMessageResponse } from '../api/types';
import { useIntakeContext } from '../context/IntakeContext';
import { useNavigate } from 'react-router-dom';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export const useIntakeChat = () => {
  const { sessionId } = useIntakeContext();
  const navigate = useNavigate();

  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const mutation = useMutation<SendMessageResponse, Error, SendMessageRequest>({
    mutationFn: (data) => {
      if (!sessionId) throw new Error('No active session');
      return sendMessage(sessionId, data);
    },
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        { id: `ast-${Date.now()}`, role: 'assistant', content: data.assistant_message },
      ]);

      if (data.session_status === 'completed') {
        navigate('/complete');
      } else if (data.session_status === 'emergency_escalated') {
        navigate('/emergency');
      }
    },
  });

  // Always points to the latest mutate — avoids stale-closure issues
  const mutateRef = useRef(mutation.mutate);
  mutateRef.current = mutation.mutate;

  const sendUserMessage = (messageId: string, content: string) => {
    setMessages((prev) => [...prev, { id: messageId, role: 'user', content }]);
    mutateRef.current({ content });
  };

  // Auto-sends the chief complaint as the very first message so the
  // orchestrator can respond with the first meaningful follow-up question.
  const sendInitialComplaint = (complaint: string) => {
    setMessages([{ id: 'initial-complaint', role: 'user', content: complaint }]);
    mutateRef.current({ content: complaint });
  };

  return {
    messages,
    sendUserMessage,
    sendInitialComplaint,
    isPending: mutation.isPending,
    error: mutation.error,
  };
};
