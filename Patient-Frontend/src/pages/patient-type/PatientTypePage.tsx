import React from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Search, ArrowRight } from 'lucide-react';
import nurqLogo from '@/assets/illustrations/nurq-patient-icon.svg';
import { PATIENT_TYPE_COPY } from './patientType.lib';
import { PageTransition } from '@/components/PageTransition';

export const PatientTypePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-b from-sky-200 via-slate-300 to-blue-200 flex flex-col">
        <header className="max-w-3xl mx-auto w-full px-5 pt-8">
          <div className="flex items-center gap-2">
            <img src={nurqLogo} alt="Nurq icon" width={40} height={40} />
            <span className="text-xl font-black text-gray-900">Nurq</span>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center px-5 py-10">
          <div className="w-full max-w-2xl">
            <div className="text-center mb-10">
              <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">
                {PATIENT_TYPE_COPY.heading}
              </h1>
              <p className="text-gray-500 mt-3 text-lg">
                {PATIENT_TYPE_COPY.subheading}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              <button
                onClick={() => navigate('/register')}
                className="group bg-white rounded-3xl p-8 shadow-sm border border-gray-100 hover:shadow-xl hover:border-blue-200 transition-all text-left"
              >
                <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                  <UserPlus size={26} className="text-blue-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mt-5">{PATIENT_TYPE_COPY.newPatient.title}</h2>
                <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                  {PATIENT_TYPE_COPY.newPatient.desc}
                </p>
                <div className="flex items-center gap-1 text-blue-600 text-sm font-semibold mt-4">
                  {PATIENT_TYPE_COPY.newPatient.cta} <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </button>

              <button
                onClick={() => navigate('/lookup')}
                className="group bg-white rounded-3xl p-8 shadow-sm border border-gray-100 hover:shadow-xl hover:border-cyan-200 transition-all text-left"
              >
                <div className="w-14 h-14 rounded-2xl bg-cyan-50 flex items-center justify-center group-hover:bg-cyan-100 transition-colors">
                  <Search size={26} className="text-cyan-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mt-5">{PATIENT_TYPE_COPY.returningPatient.title}</h2>
                <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                  {PATIENT_TYPE_COPY.returningPatient.desc}
                </p>
                <div className="flex items-center gap-1 text-cyan-600 text-sm font-semibold mt-4">
                  {PATIENT_TYPE_COPY.returningPatient.cta} <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};
