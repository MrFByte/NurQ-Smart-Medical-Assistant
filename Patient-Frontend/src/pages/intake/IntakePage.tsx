import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Mic, Keyboard, Volume2, Loader2 } from 'lucide-react';
import nurqLogo from '../../assets/illustrations/nurq-patient-icon.svg';
import { INTAKE_COPY } from './intake.lib';
import { useIntakeChat } from '../../hooks/useIntakeChat';
import { useIntakeContext } from '../../context/IntakeContext';
import { useNavigate } from 'react-router-dom';
import { PageTransition } from '../../components/PageTransition';
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
    isPending,
    isLoadingHistory,
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
  const spokenIds = useRef(new Set<string>()); // tracks which AI messages we've already spoken
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null); // debounce timer

  // Forward refs so callbacks can always call the latest version
  const startListeningFn = useRef<() => void>(() => {});
  const sendUserMessageRef = useRef(sendUserMessage);
  sendUserMessageRef.current = sendUserMessage;

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

  // ─── Browser TTS helper ───────────────────────────────────────────────────
  const speakText = useCallback((text: string) => {
    if (!voiceOnRef.current) return;
    if (!('speechSynthesis' in window)) {
      // No TTS support — just restart listening
      startListeningFn.current();
      return;
    }

    window.speechSynthesis.cancel();
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

      const afterSpeak = () => {
        setVoicePhase('idle');
        if (voiceOnRef.current) {
          setTimeout(() => startListeningFn.current(), 350);
        }
      };
      utter.onend = afterSpeak;
      utter.onerror = afterSpeak;
      window.speechSynthesis.speak(utter);
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

  // ─── Speech Recognition ───────────────────────────────────────────────────
  const startListening = useCallback(() => {
    if (!voiceOnRef.current) return;
    // Prevent overlapping .start() calls — the browser throws if you call
    // start() while another instance is already running, which itself causes
    // the mic icon to flash and the recognition to abort immediately.
    if (isListeningRef.current) return;

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    // Brief delay so browser audio pipeline is ready after TTS
    setTimeout(() => {
      if (!voiceOnRef.current) return;
      if (isListeningRef.current) return;

      const recognition = new SR();
      // continuous=true keeps ONE mic session open indefinitely.
      // Without this the browser re-requests the mic on every restart,
      // which is what makes the tab icon blink.
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      let accumulatedTranscript = '';

      const flushTranscript = () => {
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
        const heard = accumulatedTranscript.trim();
        if (heard && voiceOnRef.current) {
          accumulatedTranscript = '';
          setInterimText('');
          // Stop the recognition first so it doesn't capture our own TTS
          try { recognition.stop(); } catch (_) {}
          setVoicePhase('processing');
          sendUserMessageRef.current(uuidv4(), heard);
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
        const heard = accumulatedTranscript.trim();
        accumulatedTranscript = '';
        if (heard && voiceOnRef.current) {
          setInterimText('');
          setVoicePhase('processing');
          sendUserMessageRef.current(uuidv4(), heard);
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
      try {
        recognition.start();
      } catch (_) {
        isListeningRef.current = false;
        setTimeout(() => startListeningFn.current(), 600);
      }
    }, 150);
  }, []); // stable — reads from refs only

  // Keep the forward ref in sync
  startListeningFn.current = startListening;

  // ─── Watch messages: speak new AI responses in voice mode ─────────────────
  useEffect(() => {
    if (inputMode !== 'speak' || isPending || !voiceOnRef.current) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== 'assistant' || spokenIds.current.has(last.id)) return;
    spokenIds.current.add(last.id);
    speakText(last.content);
  }, [messages, isPending, inputMode, speakText]);

  // ─── Start / stop voice session when mode changes ─────────────────────────
  useEffect(() => {
    if (inputMode === 'speak' && hasSpeechSupport) {
      voiceOnRef.current = true;
      // Only start listening if there's no pending AI message yet to speak.
      // If there is, the messages watcher above will speak it and then
      // call startListening via speakText's onend.
      const last = messages[messages.length - 1];
      const hasUnspokenAI =
        last?.role === 'assistant' && !spokenIds.current.has(last.id);
      if (!hasUnspokenAI && !isPending) {
        startListening();
      }
    } else {
      voiceOnRef.current = false;
      isListeningRef.current = false;
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      recognitionRef.current?.abort();
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      setVoicePhase('idle');
      setInterimText('');
    }
    // We deliberately exclude messages/isPending from deps here:
    // this effect is ONLY about reacting to mode/support changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputMode, hasSpeechSupport]);

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
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
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

            {/* Thinking dots */}
            {isPending && (
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
