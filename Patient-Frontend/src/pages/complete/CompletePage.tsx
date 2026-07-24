import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import nurqLogo from '@/assets/illustrations/nurq-patient-icon.svg';
import { COMPLETE_COPY } from './complete.lib';
import { useIntakeContext } from '@/context/IntakeContext';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { PageTransition } from '@/components/PageTransition';

export const CompletePage: React.FC = () => {
  const navigate = useNavigate();
  const { reset } = useIntakeContext();

  const handleDone = () => {
    reset();
    navigate('/');
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-blue-50/40 flex flex-col">
        <header className="max-w-2xl mx-auto w-full px-5 pt-8 flex justify-center">
          <div className="flex items-center gap-2">
            <img src={nurqLogo} alt="Nurq icon" width={40} height={40} />
            <span className="text-xl font-black text-gray-900">Nurq</span>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center px-5 py-8">
          <div className="w-full max-w-md">
            <Card className="text-center !p-10 shadow-xl border-blue-100">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-8 relative">
                <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-20" />
                <CheckCircle2 size={48} className="text-green-600 relative z-10" />
              </div>

              <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-4 tracking-tight">
                {COMPLETE_COPY.heading}
              </h1>
              
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                {COMPLETE_COPY.body}
              </p>

              <div className="bg-blue-50 rounded-2xl p-5 mb-8 border border-blue-100">
                <p className="text-sm text-blue-800 font-medium leading-relaxed">
                  {COMPLETE_COPY.disclaimer}
                </p>
              </div>

              <Button
                fullWidth
                onClick={handleDone}
              >
                {COMPLETE_COPY.cta}
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};
