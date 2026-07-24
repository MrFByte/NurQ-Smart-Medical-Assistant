import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Mic, Keyboard, ShieldAlert, Square } from 'lucide-react';
import nurqLogo from '@/assets/illustrations/nurq-patient-icon.svg';
import { COMPLAINT_COPY, buildSessionPayload, initSpeechRecognition } from './complaint.lib';
import { useStartSession } from '@/hooks/useStartSession';
import { useIntakeContext } from '@/context/IntakeContext';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { PageTransition } from '@/components/PageTransition';
import { useNavigate } from 'react-router-dom';

export const ChiefComplaintPage: React.FC = () => {
  const navigate = useNavigate();
  const { patientId } = useIntakeContext();
  const { mutate, isPending, error: apiError } = useStartSession();
  
  const [complaint, setComplaint] = useState('');
  const [interimText, setInterimText] = useState('');
  const [inputMode, setInputMode] = useState<'type' | 'speak'>('type');
  const [isRecording, setIsRecording] = useState(false);
  const [hasBrowserSupport, setHasBrowserSupport] = useState(true);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (!patientId) {
      navigate('/');
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setHasBrowserSupport(false);
    }
  }, [patientId, navigate]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current && isRecording) {
        recognitionRef.current.stop();
      }
    };
  }, [isRecording]);

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
            setComplaint((prev) => prev ? prev + ' ' + text : text);
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

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!complaint.trim() || !patientId) return;
    
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    }

    mutate(buildSessionPayload(patientId, complaint), {
      onSuccess: () => {
        navigate('/appointment');
      }
    });
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-blue-50/40 flex flex-col">
        <header className="max-w-3xl mx-auto w-full px-5 pt-8">
          <div className="flex items-center gap-2">
            <img src={nurqLogo} alt="Nurq icon" width={40} height={40} />
            <span className="text-xl font-black text-gray-900">Nurq</span>
          </div>
        </header>

        <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full px-5 py-6">
          <div className="flex flex-col flex-1 h-full max-h-[800px]">
            <div className="text-center mb-8 pt-4">
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">{COMPLAINT_COPY.heading}</h1>
              <p className="text-gray-500 mt-2 text-lg">{COMPLAINT_COPY.subheading}</p>
            </div>

            <Card className="flex flex-col flex-1 p-6 md:p-8 flex-grow h-full shadow-lg border-blue-50">
              {apiError && (
                <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-xl text-sm font-medium border border-red-100">
                  {apiError.message || 'Failed to start session. Please try again.'}
                </div>
              )}

              <div className="flex p-1 bg-gray-100 rounded-xl mb-6 w-full max-w-xs mx-auto">
                <button
                  className={`flex-1 py-2 text-sm font-bold flex items-center justify-center gap-2 rounded-lg transition-colors ${inputMode === 'type' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  onClick={() => setInputMode('type')}
                >
                  <Keyboard size={16} /> {COMPLAINT_COPY.typeMode}
                </button>
                <button
                  className={`flex-1 py-2 text-sm font-bold flex items-center justify-center gap-2 rounded-lg transition-colors ${inputMode === 'speak' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  onClick={() => setInputMode('speak')}
                >
                  <Mic size={16} /> {COMPLAINT_COPY.speakMode}
                </button>
              </div>

              {inputMode === 'speak' ? (
                <div className="flex flex-col flex-1 items-center justify-center mb-6 min-h-[300px]">
                  <div className="relative mb-12 group">
                    {isRecording && (
                      <>
                        <div className="absolute inset-0 bg-red-400 rounded-full animate-ping opacity-75" />
                        <div className="absolute -inset-4 bg-red-200 rounded-full animate-pulse opacity-50" />
                        <div className="absolute -inset-8 bg-red-100 rounded-full animate-pulse opacity-30 delay-75" />
                      </>
                    )}
                    <button
                      onClick={toggleRecording}
                      disabled={!hasBrowserSupport}
                      className={`relative w-32 h-32 rounded-full flex items-center justify-center shadow-2xl transition-all ${
                        isRecording 
                          ? 'bg-red-500 hover:bg-red-600 scale-105' 
                          : hasBrowserSupport 
                            ? 'bg-gradient-to-br from-blue-500 to-cyan-500 hover:scale-105 hover:shadow-blue-300'
                            : 'bg-gray-300 cursor-not-allowed'
                      }`}
                    >
                      {isRecording ? <Square size={48} className="text-white" /> : <Mic size={48} className="text-white" />}
                    </button>
                  </div>

                  <p className={`font-medium mb-6 ${isRecording ? 'text-red-500' : 'text-gray-400'}`}>
                    {!hasBrowserSupport 
                      ? 'Voice input not supported in this browser'
                      : isRecording 
                        ? COMPLAINT_COPY.status.listening 
                        : complaint 
                          ? COMPLAINT_COPY.micHint 
                          : COMPLAINT_COPY.status.idle}
                  </p>

                  <div className="w-full h-32 px-6 py-4 bg-gray-50 rounded-2xl overflow-y-auto border border-gray-100 text-center relative">
                    {complaint || interimText ? (
                      <p className="text-gray-800 text-lg leading-relaxed">
                        {complaint}
                        <span className="text-gray-400 font-light">{complaint && interimText ? ' ' : ''}{interimText}</span>
                      </p>
                    ) : (
                      <p className="text-gray-400 italic mt-8 flex items-center justify-center gap-2">
                        Your words will appear here...
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <textarea
                  className="flex-1 w-full bg-gray-50 border border-gray-200 rounded-2xl p-5 md:p-6 outline-none transition-all focus:ring-4 focus:ring-blue-100 focus:border-blue-500 resize-none text-lg md:text-xl leading-relaxed text-gray-800 placeholder-gray-400 mb-6 min-h-[300px]"
                  placeholder={COMPLAINT_COPY.placeholder}
                  value={complaint}
                  onChange={(e) => setComplaint(e.target.value)}
                  autoFocus
                />
              )}

              <div className="mt-auto">
                <div className="flex items-center gap-2 justify-center mb-4">
                  <ShieldAlert size={14} className="text-gray-400" />
                  <p className="text-xs text-gray-500">
                    {COMPLAINT_COPY.disclaimer}
                  </p>
                </div>
                
                <Button
                  fullWidth
                  onClick={() => handleSubmit()}
                  disabled={!complaint.trim() || isPending || isRecording}
                  icon={<ArrowRight size={18} className={isPending ? 'hidden' : ''} />}
                >
                  {isPending ? COMPLAINT_COPY.status.processing : COMPLAINT_COPY.submitText}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};
