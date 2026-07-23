import React from 'react';
import { AlertTriangle, Phone, ArrowRight } from 'lucide-react';
import nurqLogo from '../../assets/illustrations/nurq-patient-icon.svg';
import { useNavigate } from 'react-router-dom';
import { EMERGENCY_COPY, getEmergencyNumbers } from './emergency.lib';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { PageTransition } from '../../components/PageTransition';

export const EmergencyPage: React.FC = () => {
  const navigate = useNavigate();
  const emergencyNumbers = getEmergencyNumbers();

  return (
    <PageTransition>
      <div className="min-h-screen bg-red-600 flex flex-col">
        <header className="max-w-2xl mx-auto w-full px-5 pt-8 flex justify-center">
          <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
            <img src={nurqLogo} alt="Nurq icon" width={32} height={32} />
            <span className="text-xl font-black text-white">Nurq</span>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center px-5 py-8">
          <div className="w-full max-w-lg">
            <Card className="border-red-700 shadow-2xl p-8 md:p-10 relative overflow-hidden text-center bg-white">
              <div className="absolute top-0 left-0 w-full h-2 bg-red-600" />
              
              <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse">
                <AlertTriangle size={48} className="text-red-600" />
              </div>

              <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-4 tracking-tight">
                {EMERGENCY_COPY.heading}
              </h1>
              
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                {EMERGENCY_COPY.body}
              </p>

              <div className="bg-red-50 rounded-2xl p-6 mb-8 text-left border border-red-100">
                <ul className="space-y-4">
                  {EMERGENCY_COPY.instructions.map((instruction, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-red-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-red-700 font-bold text-sm">{idx + 1}</span>
                      </div>
                      <span className="text-red-900 font-medium">{instruction}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                {emergencyNumbers.map((contact, idx) => (
                  <div key={idx} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <div className="flex items-center justify-center gap-2 text-gray-500 text-sm mb-1">
                      <Phone size={14} />
                      {contact.label}
                    </div>
                    <div className="font-bold text-gray-900 text-xl">{contact.number}</div>
                  </div>
                ))}
              </div>

              <Button
                variant="secondary"
                fullWidth
                onClick={() => navigate('/appointment')}
                icon={<ArrowRight size={18} />}
              >
                {EMERGENCY_COPY.cta}
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};
