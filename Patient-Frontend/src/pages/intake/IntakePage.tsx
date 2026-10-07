import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Mic, Keyboard, Volume2, Loader2 } from 'lucide-react';
import nurqLogo from '@/assets/illustrations/nurq-patient-icon.svg';
import { INTAKE_COPY } from './intake.lib';
import { useIntakeChat } from '@/hooks/useIntakeChat';
import { useIntakeContext } from '@/context/IntakeContext';
import { useNavigate } from 'react-router-dom';
import { PageTransition } from '@/components/PageTransition';
import { v4 as uuidv4 } from 'uuid';

// ─── Voice phase ────────────────────────────────────────────────────────────
type VoicePhase = 'listening' | 'processing' | 'speaking' | 'idle';

export const IntakePage: React.FC = () => {
  const navigate = useNavigate();
  const { sessionId, chiefComplaint } = useIntakeContext();
  const {
    messages,
    sendUserMessage,
    sendInitialComplaint,
    sendAudioTurn,
    isPending,
    isLoadingHistory,
    isSpeaking,
    error: apiError,
    clearError,
  } = useIntakeChat();

  // ── Default mode is "Talk" (voice) ──────────────────────────────────────
  const [inputMode, setInputMode] = useState<'type' | 'speak'>('speak');
  const [inputText, setInputText] = useState('');
  const [interimText, setInterimText] = useState('');
  const [voicePhase, setVoicePhase] = useState<VoicePhase>('idle');
  const [hasSpeechSupport, setHasSpeechSupport] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Refs that cross-reference each other without stale closures
  const voiceOnRef = useRef(false);           // true while voice session is active
  const isListeningRef = useRef(false);       // guards against overlapping .start() calls
  const recognitionRef = useRef<any>(null);
  const spokenIds = useRef(new Set<string>()); // tracks which AI messages we've already spoken/fallen-back for
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null); // debounce timer

  // Real microphone capture, sent to the backend Whisper/edge-tts pipeline.
  // The Web Speech API below is kept ONLY for live captions and to detect
  // end-of-turn silence — it is never what gets sent to the server.
  const micStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Forward refs so callbacks can always call the latest version
  const startListeningFn = useRef<() => void>(() => {});
  const sendUserMessageRef = useRef(sendUserMessage);
  sendUserMessageRef.current = sendUserMessage;
  const sendAudioTurnRef = useRef(sendAudioTurn);
  sendAudioTurnRef.current = sendAudioTurn;

  // Mirror isPending/isSpeaking into refs so the stable startListening
  // callback (and the delayed retry timers inside recognition handlers) can
  // check them without stale closures. A retry timer that fires while a
  // request is in flight or while backend TTS is playing must NOT reopen the
  // mic — that's how the recognition ends up hearing the AI's own voice and
  // firing a ghost turn.
  const isPendingRef = useRef(isPending);
  isPendingRef.current = isPending;
  const isSpeakingRef = useRef(isSpeaking);
  isSpeakingRef.current = isSpeaking;
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const apiErrorRef = useRef(apiError);
  apiErrorRef.current = apiError;
  // True while the browser-TTS fallback (speechSynthesis) is speaking.
  // isSpeaking only tracks BACKEND audio, so without this the watchdog could
  // open the mic mid-fallback-speech and capture the AI's own voice.
  const fallbackSpeakingRef = useRef(false);

  /** Single source of truth for "is it OK to open the mic right now?".
   * Used by the listen-controller effect and the watchdog below so the voice
   * loop can never wedge: whenever this becomes true, listening WILL start
   * (if it isn't running already). */
  const shouldListenNow = useCallback(() => {
    if (!voiceOnRef.current || isListeningRef.current) return false;
    if (isPendingRef.current || isSpeakingRef.current || fallbackSpeakingRef.current) return false;
    const msgs = messagesRef.current;
    const last = msgs[msgs.length - 1];
    if (!last) return false;
    // After a failed request the last message is the user's turn — still
    // reopen the mic so they can retry by voice.
    if (apiErrorRef.current) return true;
    return last.role === 'assistant' && spokenIds.current.has(last.id);
  }, []);

  // ─── Redirect if no session ──────────────────────────────────────────────
  useEffect(() => {
    if (!sessionId) { navigate('/'); return; }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) setHasSpeechSupport(false);
  }, [sessionId, navigate]);

  // ─── Auto-send initial complaint (unchanged) ─────────────────────────────
  const SENT_KEY = `nurq_initial_sent_${sessionId}`;
  const hasSentInitial = React.useRef(
    sessionId ? !!sessionStorage.getItem(SENT_KEY) : false
  );
  useEffect(() => {
    if (sessionId && chiefComplaint && !hasSentInitial.current) {
      hasSentInitial.current = true;
      sessionStorage.setItem(SENT_KEY, '1');
      if (messages.length === 0) sendInitialComplaint(chiefComplaint);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, chiefComplaint]);

  // ─── Auto-scroll ─────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isPending, voicePhase]);

  // ─── Acquire the real microphone stream once per voice session ────────────
  // Kept open for the whole session (rather than re-requested every turn) so
  // there's no repeated permission prompt / mic-indicator flicker and no
  // extra latency starting the next recording.
  const ensureMicStream = useCallback(async () => {
    if (micStreamRef.current) return micStreamRef.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      return stream;
    } catch {
      return null;
    }
  }, []);

  // ─── Browser TTS fallback ──────────────────────────────────────────────────
  // Only used when the backend didn't return synthesised audio for a turn.
  // Every turn — including the auto-sent initial complaint, which now
  // requests synthesize_audio explicitly — is voiced by the real backend
  // pipeline (edge-tts, or Groq Whisper in on later turns) via
  // playAudioDataUri; this fallback only fires if that backend synthesis
  // itself came back empty (e.g. a transient edge-tts failure).
  const speakFallback = useCallback((text: string) => {
    if (!voiceOnRef.current) return;
    if (!('speechSynthesis' in window)) {
      // No TTS support — just restart listening
      startListeningFn.current();
      return;
    }

    // ── CRITICAL: Stop the recognition BEFORE speaking so the browser mic
    // doesn't capture our own TTS audio and send it as a "user" turn.
    // We set isListeningRef=false first so the onend handler doesn't
    // re-trigger startListening (which would race with afterSpeak below).
    isListeningRef.current = false;
    try { recognitionRef.current?.abort(); } catch (_) {}
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    // Also stop any in-progress MediaRecorder so we don't accumulate
    // TTS audio in audioChunksRef.
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch (_) {}
    }
    audioChunksRef.current = [];

    window.speechSynthesis.cancel();
    fallbackSpeakingRef.current = true;
    setVoicePhase('speaking');

    const doSpeak = () => {
      const utter = new SpeechSynthesisUtterance(text);

      // Pick the best available English voice (online neural voices are best)
      const voices = window.speechSynthesis.getVoices();
      const preferred =
        voices.find(v => v.name.includes('Google US English')) ??
        voices.find(v => v.name.toLowerCase().includes('aria') && v.lang === 'en-US') ??
        voices.find(v => v.lang === 'en-US' && !v.localService) ??
        voices.find(v => v.lang.startsWith('en-US')) ??
        voices.find(v => v.lang.startsWith('en')) ??
        null;
      if (preferred) utter.voice = preferred;
      utter.rate = 1.05;
      utter.pitch = 1.0;

      let spoken = false;
      const afterSpeak = () => {
        if (spoken) return;
        spoken = true;
        fallbackSpeakingRef.current = false;
        setVoicePhase('idle');
        if (voiceOnRef.current) {
          setTimeout(() => startListeningFn.current(), 350);
        }
      };
      utter.onend = afterSpeak;
      utter.onerror = afterSpeak;
      window.speechSynthesis.speak(utter);
      // Chrome sometimes never fires onend for an utterance — don't let that
      // leave fallbackSpeakingRef stuck true (which would block the watchdog).
      setTimeout(afterSpeak, Math.min(30000, 5000 + text.length * 90));
    };

    if (window.speechSynthesis.getVoices().length > 0) {
      doSpeak();
    } else {
      // Voices load asynchronously — wait for them
      let fired = false;
      window.speechSynthesis.onvoiceschanged = () => {
        if (fired) return;
        fired = true;
        window.speechSynthesis.onvoiceschanged = null;
        doSpeak();
      };
      setTimeout(() => { if (!fired) { fired = true; doSpeak(); } }, 500);
    }
  }, []); // stable — reads from refs/window only

  // ─── Dispatch a completed turn to the backend ─────────────────────────────
  // Stops the in-flight MediaRecorder and sends the real audio blob through
  // the Whisper/edge-tts pipeline. Falls back to sending the Web Speech API
  // transcript as plain text only if no recording was available, so a turn
  // is never silently lost.
  const finishTurn = useCallback((heard: string) => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        audioChunksRef.current = [];
        sendAudioTurnRef.current(blob, heard);
      };
      try {
        recorder.stop();
      } catch {
        sendUserMessageRef.current(uuidv4(), heard);
      }
    } else {
      sendUserMessageRef.current(uuidv4(), heard);
    }
  }, []); // stable — reads from refs only

  // ─── Speech Recognition ───────────────────────────────────────────────────
  const startListening = useCallback(() => {
    if (!voiceOnRef.current) return;
    // Prevent overlapping .start() calls — the browser throws if you call
    // start() while another instance is already running, which itself causes
    // the mic icon to flash and the recognition to abort immediately.
    if (isListeningRef.current) return;
    // Never open the mic while a turn is being processed or while backend
    // TTS is playing — the recognition would capture the AI's own voice and
    // dispatch it as a ghost user turn (leaving the orb stuck on "Thinking…").
    // Whichever of those states is active will restart listening itself when
    // it finishes (isSpeaking watcher / messages watcher below).
    if (isPendingRef.current || isSpeakingRef.current) return;

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    // Brief delay so browser audio pipeline is ready after TTS
    setTimeout(() => {
      if (!voiceOnRef.current) return;
      if (isListeningRef.current) return;
      if (isPendingRef.current || isSpeakingRef.current) return;

      const recognition = new SR();
      // continuous=true keeps ONE mic session open indefinitely.
      // Without this the browser re-requests the mic on every restart,
      // which is what makes the tab icon blink.
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      let accumulatedTranscript = '';
      // Set once flushTranscript hands a turn off to finishTurn — tells the
      // upcoming onend (fired by our own recognition.stop() below) not to
      // treat this as a silent/no-speech end and restart listening while
      // the AI response is still in flight.
      let turnDispatched = false;

      const flushTranscript = () => {
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
        const heard = accumulatedTranscript.trim();
        if (heard && voiceOnRef.current) {
          accumulatedTranscript = '';
          turnDispatched = true;
          setInterimText('');
          // Stop the recognition first so it doesn't capture our own TTS
          try { recognition.stop(); } catch (_) {}
          setVoicePhase('processing');
          finishTurn(heard);
        }
      };

      recognition.onstart = () => {
        isListeningRef.current = true;
        accumulatedTranscript = '';
        setVoicePhase('listening');
        setInterimText('');
      };

      recognition.onresult = (e: any) => {
        // Clear any pending silence timer on new speech
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }

        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) {
            accumulatedTranscript += e.results[i][0].transcript + ' ';
          } else {
            interim += e.results[i][0].transcript;
          }
        }
        setInterimText(interim || accumulatedTranscript.trim());

        // After 1.5 s of silence following speech, treat it as end-of-turn
        if (accumulatedTranscript.trim()) {
          silenceTimerRef.current = setTimeout(flushTranscript, 1500);
        }
      };

      recognition.onend = () => {
        isListeningRef.current = false;
        // Clear any pending debounce
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
        // flushTranscript already dispatched this turn and stopped us on
        // purpose — don't re-dispatch or restart listening underneath the
        // in-flight AI response (that stray session is what left the UI
        // stuck on "Thinking…" until a refresh).
        if (turnDispatched) {
          setInterimText('');
          return;
        }
        const heard = accumulatedTranscript.trim();
        accumulatedTranscript = '';
        if (heard && voiceOnRef.current) {
          setInterimText('');
          setVoicePhase('processing');
          finishTurn(heard);
        } else if (voiceOnRef.current) {
          // Recognition stopped without speech (e.g. no-speech timeout) — restart
          setInterimText('');
          setTimeout(() => startListeningFn.current(), 400);
        } else {
          setInterimText('');
        }
      };

      recognition.onerror = (e: any) => {
        isListeningRef.current = false;
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
        setInterimText('');
        if (e.error === 'not-allowed') {
          setHasSpeechSupport(false);
          return;
        }
        if (e.error === 'no-speech' && voiceOnRef.current) {
          // No speech detected — wait a bit then try again (avoid tight loop)
          setTimeout(() => startListeningFn.current(), 1000);
          return;
        }
        // 'aborted' is expected when we manually stop; anything else → restart
        if (e.error !== 'aborted' && voiceOnRef.current) {
          setTimeout(() => startListeningFn.current(), 1000);
        }
      };

      recognitionRef.current = recognition;

      // Start real audio capture in lockstep with the caption recognizer —
      // this is what actually gets sent to the backend Whisper/edge-tts
      // pipeline via finishTurn() above.
      if (micStreamRef.current) {
        try {
          audioChunksRef.current = [];
          const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
            ? 'audio/webm;codecs=opus'
            : 'audio/webm';
          const recorder = new MediaRecorder(micStreamRef.current, { mimeType });
          recorder.ondataavailable = (e: BlobEvent) => {
            if (e.data.size > 0) audioChunksRef.current.push(e.data);
          };
          recorder.start();
          mediaRecorderRef.current = recorder;
        } catch {
          mediaRecorderRef.current = null;
        }
      }

      try {
        recognition.start();
      } catch (_) {
        isListeningRef.current = false;
        setTimeout(() => startListeningFn.current(), 600);
      }
    }, 150);
  }, [finishTurn]); // finishTurn is stable (empty deps) — otherwise reads from refs only

  // Keep the forward ref in sync
  startListeningFn.current = startListening;

  // ─── Listen controller ────────────────────────────────────────────────────
  // The ONE place that decides when the mic opens. Declarative: it re-runs on
  // every relevant state change and reconciles toward "listening" whenever
  // shouldListenNow() allows it — instead of relying on one-shot timers fired
  // from transition watchers (whose hand-offs could be missed, e.g. when a
  // fast isSpeaking true→false flip gets batched into a single render, and
  // then nothing ever reopened the mic → orb wedged until refresh).
  //
  // It also owns the browser-TTS fallback: an unspoken AI message without
  // backend audio is voiced first, and speakFallback resumes listening itself.
  useEffect(() => {
    if (inputMode !== 'speak' || !hasSpeechSupport || !voiceOnRef.current) return;
    if (isPending || isSpeaking) return; // re-runs when these flip back

    const last = messages[messages.length - 1];
    if (!last) return;

    if (last.role === 'assistant' && !spokenIds.current.has(last.id)) {
      spokenIds.current.add(last.id);
      if (!last.hasAudio) {
        speakFallback(last.content);
        return;
      }
    }

    if (!shouldListenNow()) return;
    // Leaving "Thinking…"/stale phase behind; onstart will set 'listening'.
    setVoicePhase((p) => (p === 'listening' ? p : 'idle'));
    const t = setTimeout(() => startListeningFn.current(), 350);
    return () => clearTimeout(t);
  }, [messages, isPending, isSpeaking, apiError, inputMode, hasSpeechSupport, speakFallback, shouldListenNow]);

  // ─── Hard-mute the mic while backend-synthesised audio plays ──────────────
  // Any recognition still live at this point would hear the AI's voice
  // through the speakers and dispatch it as a ghost user turn.
  useEffect(() => {
    if (!isSpeaking) return;
    isListeningRef.current = false;
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    try { recognitionRef.current?.abort(); } catch (_) {}
    // Stop the recorder WITHOUT an onstop handler attached so nothing gets
    // dispatched, and drop whatever audio it captured.
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = null;
      try { mediaRecorderRef.current.stop(); } catch (_) {}
    }
    audioChunksRef.current = [];
    setInterimText('');
  }, [isSpeaking]);

  // ─── Start / stop voice session when mode changes ─────────────────────────
  useEffect(() => {
    if (inputMode === 'speak' && hasSpeechSupport) {
      voiceOnRef.current = true;
      ensureMicStream();
      // The listen controller above decides when the mic actually opens.
      // This watchdog is the last line of defense: if any hand-off is ever
      // missed (a start attempt failed silently, an event never fired), it
      // notices "we should be listening but aren't" and re-kicks — so the
      // voice loop can never stay wedged.
      const watchdog = setInterval(() => {
        if (shouldListenNow()) startListeningFn.current();
      }, 2000);
      return () => clearInterval(watchdog);
    } else {
      voiceOnRef.current = false;
      isListeningRef.current = false;
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      recognitionRef.current?.abort();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch (_) {}
      }
      micStreamRef.current?.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      fallbackSpeakingRef.current = false;
      setVoicePhase('idle');
      setInterimText('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputMode, hasSpeechSupport, shouldListenNow]);

  // ─── Cleanup on unmount ───────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      voiceOnRef.current = false;
      isListeningRef.current = false;
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      recognitionRef.current?.abort();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch (_) {}
      }
      micStreamRef.current?.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      fallbackSpeakingRef.current = false;
    };
  }, []);

  // ─── Type mode send ───────────────────────────────────────────────────────
  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isPending) return;
    sendUserMessage(uuidv4(), inputText);
    setInputText('');
  };

  // ─── Derived display state ────────────────────────────────────────────────
  const displayPhase: VoicePhase =
    isSpeaking ? 'speaking' :
    isPending ? 'processing' :
    voicePhase;

  // ─── Orb colours per phase ────────────────────────────────────────────────
  const orbClass =
    displayPhase === 'listening'  ? 'from-blue-500 to-cyan-400 scale-110' :
    displayPhase === 'speaking'   ? 'from-violet-500 to-pink-400 scale-105' :
    displayPhase === 'processing' ? 'from-slate-400 to-slate-600' :
                                    'from-blue-400 to-cyan-300 opacity-60';

  const phaseLabel =
    displayPhase === 'listening'  ? '🎙️ Listening…' :
    displayPhase === 'speaking'   ? '🔊 NurQ is speaking…' :
    displayPhase === 'processing' ? '⏳ Thinking…' :
                                    '⏸ Starting…';

  const phaseColor =
    displayPhase === 'listening'  ? 'text-blue-500' :
    displayPhase === 'speaking'   ? 'text-violet-500' :
    displayPhase === 'processing' ? 'text-slate-500' :
                                    'text-gray-400';

  return (
    <PageTransition>
      <div className="min-h-screen bg-gray-50 flex flex-col">

        {/* ── Header ── */}
        <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-10">
          <div className="max-w-3xl mx-auto w-full px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img src={nurqLogo} alt="Nurq icon" width={40} height={40} />
                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full" />
              </div>
              <div>
                <h1 className="font-bold text-gray-900 leading-tight">{INTAKE_COPY.header}</h1>
                <p className="text-xs font-medium text-gray-500">{INTAKE_COPY.subHeader}</p>
              </div>
            </div>

            {/* Mode toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                id="mode-type"
                onClick={() => setInputMode('type')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md flex items-center gap-1.5 transition-colors ${
                  inputMode === 'type'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Keyboard size={14} />
                <span className="hidden sm:inline">Type</span>
              </button>
              <button
                id="mode-talk"
                onClick={() => setInputMode('speak')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md flex items-center gap-1.5 transition-colors ${
                  inputMode === 'speak'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Mic size={14} />
                <span className="hidden sm:inline">Talk</span>
              </button>
            </div>
          </div>
        </header>

        {/* ── Chat messages ── */}
        <div className="flex-1 overflow-y-auto w-full">
          <div className="max-w-3xl mx-auto w-full px-5 py-6 space-y-6">
            {isLoadingHistory ? (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm w-3/4 max-w-[300px]">
                  <div className="h-4 bg-gray-200 rounded animate-pulse mb-3 w-3/4" />
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-full mb-2" />
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-5/6" />
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-5 py-3.5 ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-tr-sm shadow-md shadow-blue-200'
                        : 'bg-white text-gray-800 rounded-tl-sm shadow-sm border border-gray-100'
                    }`}
                  >
                    <p className="text-[15px] leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              ))
            )}

            {/* Thinking dots — hidden in Talk mode since the orb below already shows this,
                unless voice isn't supported and the orb view isn't rendered at all */}
            {isPending && (inputMode === 'type' || !hasSpeechSupport) && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '160ms' }} />
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '320ms' }} />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* ── Bottom input area ── */}
        <div className="bg-white border-t border-gray-100 p-4 sm:p-5">
          <div className="max-w-3xl mx-auto">

            {/* Error banner */}
            {apiError && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm font-medium border border-red-100 flex items-center justify-between gap-3">
                <span>{apiError.message || 'Error sending message. Please try again.'}</span>
                <button
                  onClick={clearError}
                  className="shrink-0 px-3 py-1 text-xs font-bold bg-red-100 hover:bg-red-200 text-red-700 rounded-md transition-colors"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* ── TYPE MODE ── */}
            {inputMode === 'type' && (
              <form onSubmit={handleSend} className="relative flex items-center">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={INTAKE_COPY.placeholder}
                  className="w-full bg-gray-50 border border-gray-200 rounded-full pl-6 pr-14 py-4 outline-none transition-all focus:ring-4 focus:ring-blue-100 focus:border-blue-500 text-gray-800 shadow-inner"
                  disabled={isPending}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || isPending}
                  className="absolute right-2 w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white disabled:bg-gray-300 disabled:text-gray-500 transition-colors shadow-sm hover:bg-blue-700"
                >
                  <Send size={18} className="ml-0.5" />
                </button>
              </form>
            )}

            {/* ── TALK MODE — no browser support ── */}
            {inputMode === 'speak' && !hasSpeechSupport && (
              <div className="text-center py-4 space-y-3">
                <p className="text-sm text-gray-500">
                  Voice input isn't supported in this browser. Please use Chrome or Edge.
                </p>
                <button
                  onClick={() => setInputMode('type')}
                  className="px-5 py-2 rounded-full bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Switch to typing
                </button>
              </div>
            )}

            {/* ── TALK MODE — Gemini Live-style UI ── */}
            {inputMode === 'speak' && hasSpeechSupport && (
              <div className="flex flex-col items-center py-4 gap-3">

                {/* Animated orb */}
                <div className="relative flex items-center justify-center w-28 h-28 mb-1">

                  {/* Outer pulse rings */}
                  {displayPhase === 'listening' && (
                    <>
                      <div className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-[0.18]" />
                      <div
                        className="absolute rounded-full bg-cyan-300 animate-ping opacity-[0.12]"
                        style={{ inset: '-14px', animationDelay: '0.35s' }}
                      />
                    </>
                  )}
                  {displayPhase === 'speaking' && (
                    <>
                      <div className="absolute inset-0 rounded-full bg-violet-400 animate-ping opacity-[0.18]" />
                      <div
                        className="absolute rounded-full bg-pink-300 animate-ping opacity-[0.12]"
                        style={{ inset: '-14px', animationDelay: '0.4s' }}
                      />
                    </>
                  )}

                  {/* Core orb */}
                  <div
                    className={`w-28 h-28 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 bg-gradient-to-br ${orbClass}`}
                  >
                    {displayPhase === 'speaking' && (
                      <Volume2 size={40} className="text-white animate-pulse" />
                    )}
                    {displayPhase === 'processing' && (
                      <Loader2 size={40} className="text-white animate-spin" />
                    )}
                    {(displayPhase === 'listening' || displayPhase === 'idle') && (
                      <Mic size={40} className="text-white" />
                    )}
                  </div>
                </div>

                {/* Phase label */}
                <p className={`text-sm font-semibold tracking-wide transition-colors ${phaseColor}`}>
                  {phaseLabel}
                </p>

                {/* Live interim transcript */}
                {interimText && displayPhase === 'listening' && (
                  <p className="text-sm text-gray-400 italic max-w-xs text-center leading-relaxed px-2">
                    "{interimText}"
                  </p>
                )}

                {/* Subtle hint */}
                {displayPhase === 'listening' && !interimText && (
                  <p className="text-xs text-gray-300 text-center">
                    Speak naturally — NurQ will respond when you pause
                  </p>
                )}

                {/* End voice session → switch to typing */}
                <button
                  id="end-voice-session"
                  onClick={() => setInputMode('type')}
                  className="mt-2 px-5 py-2 rounded-full border border-gray-200 text-gray-400 text-xs font-medium hover:bg-gray-50 hover:text-gray-600 hover:border-gray-300 transition-all"
                >
                  Switch to typing
                </button>
              </div>
            )}

          </div>
        </div>
      </div>
    </PageTransition>
  );
};
