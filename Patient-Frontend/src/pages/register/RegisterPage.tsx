import React, { useState } from 'react';
import { ArrowRight, User, Phone, Calendar } from 'lucide-react';
import nurqLogo from '@/assets/illustrations/nurq-patient-icon.svg';
import { REGISTER_COPY, validateRegistrationForm, buildRegistrationPayload } from './register.lib';
import { useRegisterPatient } from '@/hooks/useRegisterPatient';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { PageTransition } from '@/components/PageTransition';

export const RegisterPage: React.FC = () => {
  const [formData, setFormData] = useState({ fullName: '', phone: '', age: '', gender: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { mutate, isPending, error: apiError } = useRegisterPatient();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validateRegistrationForm(formData);
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    setErrors({});
    mutate(buildRegistrationPayload(formData));
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
              <h1 className="text-3xl font-black text-gray-900">{REGISTER_COPY.heading}</h1>
              <p className="text-gray-500 mt-2">{REGISTER_COPY.subheading}</p>
            </div>

            <Card>
              {apiError && (
                <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl text-sm font-medium border border-red-100">
                  {apiError.message || 'Registration failed. Please try again.'}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <Input
                  label={REGISTER_COPY.fields.fullName}
                  icon={<User size={20} />}
                  placeholder="John Doe"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  error={errors.fullName}
                />

                <Input
                  label={REGISTER_COPY.fields.phone}
                  icon={<Phone size={20} />}
                  type="tel"
                  placeholder="(555) 000-0000"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  error={errors.phone}
                />

                <div className="grid grid-cols-2 gap-5">
                  <Input
                    label={REGISTER_COPY.fields.age}
                    icon={<Calendar size={20} />}
                    type="number"
                    placeholder="30"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    error={errors.age}
                  />

                  <div className="w-full">
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      {REGISTER_COPY.fields.gender}
                    </label>
                    <select
                      className={`w-full bg-gray-50/50 border ${
                        errors.gender ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                      } rounded-xl px-4 py-3.5 outline-none transition-all focus:ring-4 appearance-none`}
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    >
                      <option value="">Select...</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                    {errors.gender && <p className="mt-1.5 text-sm text-red-500">{errors.gender}</p>}
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    fullWidth
                    disabled={isPending}
                    icon={<ArrowRight size={18} className={isPending ? 'hidden' : ''} />}
                  >
                    {isPending ? 'Registering...' : REGISTER_COPY.submit}
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
