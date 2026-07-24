import { useState, useRef, useCallback, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { sendMessage, getHistory, sendAudioMessage } from '@/api/intake.api';
import { SendMessageRequest, SendMessageResponse } from '@/api/types';
import { useIntakeContext } from '@/context/IntakeContext';
import { useNavigate } from 'react-router-dom';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

/** Play a base64 audio/mp3 data URI. Returns a Promise that resolves when playback ends. */
const playAudioDataUri = (dataUri: string): Promise<void> => {
  return new Promise((resolve) => {
    const audio = new Audio(dataUri);
    audio.onended = () => resolve();
    audio.onerror = () => resolve(); // resolve even on error so UI doesn't lock
    audio.play().catch(() => resolve());
  });
};

export const useIntakeChat = () => {
  const { sessionId } = useIntakeContext();
  const navigate = useNavigate();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false); // AI TTS is playing

  // Fetch chat history on mount ONLY on page refresh (when complaint was already sent).
  // On first visit, the complaint is sent fresh and we never need to load history.
  // This prevents a race condition where history and the initial mutation interfere.
  const SENT_KEY = `nurq_initial_sent_${sessionId}`;
  const wasAlreadySent = sessionId ? !!sessionStorage.getItem(SENT_KEY) : false;

  useEffect(() => {
    if (sessionId && wasAlreadySent) {
      setIsLoadingHistory(true);
      getHistory(sessionId)
        .then((data) => {
          if (data.turns && data.turns.length > 0) {
            setMessages(
              data.turns.map((t) => ({
                id: t.id,
                role: t.role as 'user' | 'assistant',
                content: t.content,
              }))
            );
          }
        })
        .catch((err) => console.error('Failed to load chat history:', err))
        .finally(() => setIsLoadingHistory(false));
    }
  }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Shared handler for successful AI responses — appends message + plays TTS if present */
  const handleSuccess = useCallback(async (data: SendMessageResponse) => {
    setMessages((prev) => [
      ...prev,
      { id: `ast-${Date.now()}`, role: 'assistant', content: data.assistant_message },
    ]);

    // Play TTS audio if the response came from /audio-message endpoint
    if (data.audio_url) {
      setIsSpeaking(true);
      await playAudioDataUri(data.audio_url);
      setIsSpeaking(false);
    }

    if (data.session_status === 'completed') {
      navigate('/complete');
    } else if (data.session_status === 'emergency_escalated') {
      navigate('/emergency');
    }
  }, [navigate]);

  // ─── TEXT message mutation ─────────────────────────────────────────────────
  const mutation = useMutation<SendMessageResponse, Error, SendMessageRequest>({
    mutationFn: (data) => {
      if (!sessionId) throw new Error('No active session');
      return sendMessage(sessionId, data);
    },
    onSuccess: handleSuccess,
    onError: (error) => {
      // isPending is automatically set to false by react-query on error,
      // which re-enables the input field. We just log for debugging.
      console.error('Intake message failed:', error.message);
    },
  });

  // ─── AUDIO message mutation ────────────────────────────────────────────────
  const audioMutation = useMutation<SendMessageResponse, Error, Blob>({
    mutationFn: (blob) => {
      if (!sessionId) throw new Error('No active session');
      return sendAudioMessage(sessionId, blob);
    },
    onSuccess: handleSuccess,
    onError: (error) => {
      console.error('Audio message failed:', error.message);
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

  /**
   * Called when the user stops recording in Speak mode.
   * Posts the audio blob to the backend Whisper STT + orchestrator pipeline.
   * The backend returns the AI's text response and synthesised TTS audio.
   * localTranscript is the browser-side Web Speech API transcript (shown immediately in UI).
   */
  const sendAudioTurn = useCallback((blob: Blob, localTranscript?: string) => {
    const userBubbleContent = localTranscript?.trim() || '🎙️ Voice message';
    setMessages((prev) => [
      ...prev,
      { id: `usr-audio-${Date.now()}`, role: 'user', content: userBubbleContent },
    ]);
    audioMutation.mutate(blob);
  }, [audioMutation]);

  // Let the UI clear the error state so the user can retry
  const clearError = useCallback(() => {
    mutation.reset();
    audioMutation.reset();
  }, [mutation, audioMutation]);

  return {
    messages,
    sendUserMessage,
    sendInitialComplaint,
    sendAudioTurn,
    isPending: mutation.isPending || audioMutation.isPending,
    isLoadingHistory,
    isSpeaking,
    error: mutation.error ?? audioMutation.error,
    clearError,
  };
};
