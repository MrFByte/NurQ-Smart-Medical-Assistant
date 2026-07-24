import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Ticket, UserCircle, Clock } from 'lucide-react';
import nurqLogo from '@/assets/illustrations/nurq-patient-icon.svg';
import { formatAppointmentNumber, getWaitMessage, INTAKE_PROMPT } from './appointment.lib';
import { useIntakeContext } from '@/context/IntakeContext';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { PageTransition } from '@/components/PageTransition';

export const AppointmentPage: React.FC = () => {
  const navigate = useNavigate();
  const { appointmentNumber, patientId, registrationId } = useIntakeContext();

  useEffect(() => {
    if (!patientId) {
      navigate('/');
    }
  }, [patientId, navigate]);

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-blue-50/40 flex flex-col">
        <header className="max-w-2xl mx-auto w-full px-5 pt-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={nurqLogo} alt="Nurq icon" width={40} height={40} />
            <span className="text-xl font-black text-gray-900">Nurq</span>
          </div>
          {registrationId && (
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-600 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100">
              <UserCircle size={16} />
              ID: {registrationId}
            </div>
          )}
        </header>

        <div className="flex-1 flex items-center justify-center px-5 py-8">
          <div className="w-full max-w-md space-y-6">
            <Card className="text-center bg-gradient-to-b from-blue-600 to-blue-700 !border-0 !p-10 relative overflow-hidden group hover:!shadow-2xl hover:!shadow-blue-200" hoverable>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-cyan-300/20 rounded-full blur-2xl transform -translate-x-1/2 translate-y-1/2" />
              
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mx-auto mb-6 shadow-inner border border-white/20">
                  <Ticket size={32} className="text-white" />
                </div>
                <p className="text-blue-100 font-medium mb-2 tracking-wide uppercase text-sm">Your Token Number</p>
                <h1 className="text-6xl md:text-7xl font-black text-white mb-6 tracking-tighter drop-shadow-sm">
                  {formatAppointmentNumber(appointmentNumber)}
                </h1>
                <div className="flex items-center justify-center gap-2 text-blue-100/90 text-sm bg-black/10 w-fit mx-auto px-4 py-2 rounded-full backdrop-blur-sm border border-white/10">
                  <Clock size={14} />
                  {getWaitMessage(appointmentNumber)}
                </div>
              </div>
            </Card>

            <Card className="!p-8 group hover:!border-blue-200" hoverable>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 transition-colors">
                  <img src={nurqLogo} alt="Nurq icon" width={28} height={28} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{INTAKE_PROMPT.heading}</h3>
                  <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                    {INTAKE_PROMPT.body}
                  </p>
                </div>
              </div>
              <Button
                fullWidth
                className="mt-6 shadow-lg shadow-blue-200"
                onClick={() => navigate('/intake')}
                icon={<ArrowRight size={18} />}
              >
                {INTAKE_PROMPT.cta}
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};
