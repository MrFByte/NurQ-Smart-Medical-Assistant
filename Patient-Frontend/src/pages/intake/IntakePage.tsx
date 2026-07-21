import React, { useState, useEffect, useRef } from 'react';
import { Send, Mic, Keyboard, HeartPulse, Square } from 'lucide-react';
import { INTAKE_COPY, initSpeechRecognition } from './intake.lib';
import { useIntakeChat } from '../../hooks/useIntakeChat';
import { useIntakeContext } from '../../context/IntakeContext';
import { useNavigate } from 'react-router-dom';
import { PageTransition } from '../../components/PageTransition';
import { v4 as uuidv4 } from 'uuid';

export const IntakePage: React.FC = () => {
  const navigate = useNavigate();
  const { sessionId, chiefComplaint } = useIntakeContext();
  const { messages, sendUserMessage, sendInitialComplaint, isPending, error: apiError } = useIntakeChat();
  
  const [inputMode, setInputMode] = useState<'type' | 'speak'>('type');
  const [inputText, setInputText] = useState('');
  const [interimText, setInterimText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [hasBrowserSupport, setHasBrowserSupport] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (!sessionId) {
      navigate('/');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setHasBrowserSupport(false);
    }
  }, [sessionId, navigate]);

  // Auto-send the chief complaint as the opening message.
  // A sessionStorage flag prevents re-sending on page refresh.
  const SENT_KEY = `nurq_initial_sent_${sessionId}`;
  const hasSentInitial = React.useRef(
    sessionId ? !!sessionStorage.getItem(SENT_KEY) : false
  );
  useEffect(() => {
    if (sessionId && chiefComplaint && !hasSentInitial.current) {
      hasSentInitial.current = true;
      sessionStorage.setItem(SENT_KEY, '1');
      sendInitialComplaint(chiefComplaint);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, chiefComplaint]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, interimText, isPending]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current && isRecording) {
        recognitionRef.current.stop();
      }
    };
  }, [isRecording]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isPending) return;

    sendUserMessage(uuidv4(), inputText);
    setInputText('');
  };

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      setInterimText('');
    } else {
      if (!recognitionRef.current) {
        recognitionRef.current = initSpeechRecognition(
          (text) => setInterimText(text),
          (text) => {
            setInputText((prev) => prev ? prev + ' ' + text : text);
            setInterimText('');
          },
          () => setIsRecording(false)
        );
      }
      
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
          setIsRecording(true);
        } catch (e) {
          console.error("Error starting recognition", e);
        }
      }
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-10">
          <div className="max-w-3xl mx-auto w-full px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-md">
                  <HeartPulse size={20} className="text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
              </div>
              <div>
                <h1 className="font-bold text-gray-900 leading-tight">{INTAKE_COPY.header}</h1>
                <p className="text-xs font-medium text-gray-500">{INTAKE_COPY.subHeader}</p>
              </div>
            </div>
            
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setInputMode('type')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md flex items-center gap-1.5 transition-colors ${
                  inputMode === 'type' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Keyboard size={14} /> <span className="hidden sm:inline">{INTAKE_COPY.typeMode}</span>
              </button>
              <button
                onClick={() => setInputMode('speak')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md flex items-center gap-1.5 transition-colors ${
                  inputMode === 'speak' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Mic size={14} /> <span className="hidden sm:inline">{INTAKE_COPY.speakMode}</span>
              </button>
            </div>
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto w-full">
          <div className="max-w-3xl mx-auto w-full px-5 py-6 space-y-6">
            {messages.map((msg) => (
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
            ))}

            {isPending && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '160ms' }}></div>
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '320ms' }}></div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="bg-white border-t border-gray-100 p-4 sm:p-5">
          <div className="max-w-3xl mx-auto">
            {apiError && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm font-medium border border-red-100">
                {apiError.message || 'Error sending message. Please try again.'}
              </div>
            )}
            
            {inputMode === 'type' ? (
              <form onSubmit={handleSend} className="relative flex items-center">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={INTAKE_COPY.placeholder}
                  className="w-full bg-gray-50 border border-gray-200 rounded-full pl-6 pr-14 py-4 outline-none transition-all focus:ring-4 focus:ring-blue-100 focus:border-blue-500 text-gray-800 shadow-inner"
                  disabled={isPending}
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || isPending}
                  className="absolute right-2 w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white disabled:bg-gray-300 disabled:text-gray-500 transition-colors shadow-sm hover:bg-blue-700"
                >
                  <Send size={18} className="ml-0.5" />
                </button>
              </form>
            ) : (
              <div className="flex flex-col items-center justify-center pt-2 pb-4">
                <div className="relative mb-6 group">
                  {isRecording && (
                    <>
                      <div className="absolute inset-0 bg-red-400 rounded-full animate-ping opacity-75" />
                      <div className="absolute -inset-4 bg-red-200 rounded-full animate-pulse opacity-50" />
                    </>
                  )}
                  <button
                    onClick={toggleRecording}
                    disabled={!hasBrowserSupport}
                    className={`relative w-20 h-20 rounded-full flex items-center justify-center shadow-xl transition-all ${
                      isRecording 
                        ? 'bg-red-500 hover:bg-red-600 scale-105' 
                        : hasBrowserSupport
                          ? 'bg-gradient-to-br from-blue-500 to-cyan-500 hover:scale-105'
                          : 'bg-gray-300 cursor-not-allowed'
                    }`}
                  >
                    {isRecording ? <Square size={28} className="text-white" /> : <Mic size={28} className="text-white" />}
                  </button>
                </div>
                
                <p className={`text-sm font-medium mb-4 ${isRecording ? 'text-red-500' : 'text-gray-400'}`}>
                  {!hasBrowserSupport
                    ? 'Voice input not supported in this browser'
                    : isRecording
                      ? INTAKE_COPY.status.listening
                      : inputText
                        ? INTAKE_COPY.micHint
                        : INTAKE_COPY.status.idle}
                </p>

                {/* Optional input display to edit before send */}
                <div className="w-full relative flex items-center mt-2">
                  <div className="flex-1 bg-gray-50 border border-gray-200 rounded-full pl-6 pr-14 py-3 min-h-[50px] text-gray-800 shadow-inner break-words">
                     {inputText || interimText ? (
                        <>
                          {inputText}
                          <span className="text-gray-400 font-light">{inputText && interimText ? ' ' : ''}{interimText}</span>
                        </>
                      ) : (
                        <span className="text-gray-400 italic">Your words will appear here...</span>
                      )}
                  </div>
                  <button
                    onClick={() => handleSend()}
                    disabled={!inputText.trim() || isPending || isRecording}
                    className="absolute right-2 w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white disabled:bg-gray-300 transition-colors shadow-sm hover:bg-blue-700"
                  >
                    <Send size={16} className="ml-0.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
};
