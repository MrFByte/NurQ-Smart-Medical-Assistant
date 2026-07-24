import React, { useState } from 'react';
import { ArrowRight, Search, Hash, Phone } from 'lucide-react';
import nurqLogo from '@/assets/illustrations/nurq-patient-icon.svg';
import { LOOKUP_COPY, normalizeRegistrationId, normalizePhone, validateLookupInput } from './lookup.lib';
import { useLookupPatient } from '@/hooks/useLookupPatient';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { PageTransition } from '@/components/PageTransition';

export const LookupPage: React.FC = () => {
  const [mode, setMode] = useState<'id' | 'phone'>('id');
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');

  const { lookupById, lookupByPhone } = useLookupPatient();
  const currentMutation = mode === 'id' ? lookupById : lookupByPhone;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateLookupInput(mode, inputValue)) {
      setError(mode === 'id' ? LOOKUP_COPY.idMode.error : LOOKUP_COPY.phoneMode.error);
      return;
    }
    setError('');
    
    if (mode === 'id') {
      lookupById.mutate({ registration_id: normalizeRegistrationId(inputValue) });
    } else {
      lookupByPhone.mutate({ phone: normalizePhone(inputValue) });
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-blue-50/40 flex flex-col">
        <header className="max-w-2xl mx-auto w-full px-5 pt-8">
          <div className="flex items-center gap-2">
            <img src={nurqLogo} alt="Nurq icon" width={40} height={40} />
            <span className="text-xl font-black text-gray-900">Nurq</span>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center px-5 py-8">
          <div className="w-full max-w-lg">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-3xl bg-cyan-50 flex items-center justify-center mx-auto mb-6">
                <Search size={32} className="text-cyan-600" />
              </div>
              <h1 className="text-3xl font-black text-gray-900">{LOOKUP_COPY.heading}</h1>
              <p className="text-gray-500 mt-2">{LOOKUP_COPY.subheading}</p>
            </div>

            <Card>
              {currentMutation.error && (
                <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl text-sm font-medium border border-red-100">
                  {currentMutation.error.message || 'Patient not found. Please check your details and try again.'}
                </div>
              )}

              <div className="flex p-1 bg-gray-100 rounded-xl mb-6">
                <button
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${mode === 'id' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  onClick={() => { setMode('id'); setInputValue(''); setError(''); currentMutation.reset(); }}
                >
                  {LOOKUP_COPY.tabs.id}
                </button>
                <button
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${mode === 'phone' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  onClick={() => { setMode('phone'); setInputValue(''); setError(''); currentMutation.reset(); }}
                >
                  {LOOKUP_COPY.tabs.phone}
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <Input
                  label={mode === 'id' ? LOOKUP_COPY.idMode.label : LOOKUP_COPY.phoneMode.label}
                  icon={mode === 'id' ? <Hash size={20} /> : <Phone size={20} />}
                  placeholder={mode === 'id' ? LOOKUP_COPY.idMode.placeholder : LOOKUP_COPY.phoneMode.placeholder}
                  type={mode === 'phone' ? 'tel' : 'text'}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  error={error}
                />

                <div className="pt-2">
                  <Button
                    type="submit"
                    fullWidth
                    disabled={currentMutation.isPending}
                    icon={<ArrowRight size={18} className={currentMutation.isPending ? 'hidden' : ''} />}
                  >
                    {currentMutation.isPending ? 'Looking up...' : LOOKUP_COPY.submit}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};
