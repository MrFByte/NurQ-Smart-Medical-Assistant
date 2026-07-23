import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Clock, Users, Sparkles, ArrowRight, Stethoscope, Brain, Activity } from 'lucide-react';
import doctorsIllustration from '../../assets/illustrations/undraw_doctors_djoj.svg';
import midwivesIllustration from '../../assets/illustrations/Midwives-rafiki.svg';
import nurqLogo from '../../assets/illustrations/nurq-patient-icon.svg';
import { LANDING_COPY, STATS, HOW_IT_WORKS, FEATURES } from './landing.lib';
import { PageTransition } from '../../components/PageTransition';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const handleGetAppointment = () => {
    navigate('/patient-type');
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-b from-sky-200 via-slate-300 to-blue-50/40">
        {/* Nav */}
        <nav className="max-w-7xl mx-auto px-5 lg:px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={nurqLogo} alt="Nurq icon" width={40} height={40} />
            <span className="text-2xl font-black tracking-tight text-gray-900">Nurq</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <a href="#features" className="hover:text-blue-600 transition-colors">Features</a>
            <a href="#how" className="hover:text-blue-600 transition-colors">How it works</a>
            <a href="#stats" className="hover:text-blue-600 transition-colors">About</a>
          </div>
          <button
            onClick={handleGetAppointment}
            className="bg-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-blue-700 transition-colors shadow-sm"
          >
            Get Appointment
          </button>
        </nav>

        {/* Hero */}
        <section className="max-w-7xl mx-auto px-5 lg:px-8 pt-8 lg:pt-16 pb-16">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                <Sparkles size={13} />
                {LANDING_COPY.badge}
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-gray-900 leading-[1.1]">
                {LANDING_COPY.headlineStart}<br />
                <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">{LANDING_COPY.headlineEnd}</span>
              </h1>
              <p className="text-lg text-gray-600 leading-relaxed max-w-md">
                {LANDING_COPY.subtext}
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleGetAppointment}
                  className="group bg-blue-600 text-white font-semibold px-7 py-3.5 rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 hover:shadow-xl hover:shadow-blue-300 flex items-center justify-center gap-2"
                >
                  Get Appointment
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>
                <a
                  href="#how"
                  className="border border-gray-200 bg-gray-50/50 text-gray-700 font-semibold px-7 py-3.5 rounded-2xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Stethoscope size={18} />
                  How it works
                </a>
              </div>
            </div>

            {/* Hero illustration card */}
            <div className="relative">
              <div className="absolute -top-6 -left-6 w-72 h-72 bg-blue-200/30 rounded-full blur-3xl" />
              <div className="absolute -bottom-6 -right-6 w-64 h-64 bg-cyan-200/30 rounded-full blur-3xl" />
              <div className="relative p-8">
                <img src={doctorsIllustration} alt="Medical professionals" className="w-full h-auto" />
                <div className="absolute top-6 right-6 bg-white rounded-2xl shadow-lg p-3 flex items-center gap-2 border border-gray-50">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-xs font-semibold text-gray-700">Care without delay</span>
                </div>
                <div className="absolute bottom-6 left-6 bg-white rounded-2xl shadow-lg p-3 flex items-center gap-2 border border-gray-50">
                  <ShieldCheck size={16} className="text-blue-600" />
                  <span className="text-xs font-semibold text-gray-700">Secure & Private</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section id="stats" className="max-w-7xl mx-auto px-5 lg:px-8 py-12">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {STATS.map((stat, i) => {
              const icons = [Users, Clock, Brain, Activity];
              const Icon = icons[i];
              return (
                <div key={i} className="bg-white rounded-2xl p-5 lg:p-6 shadow-sm border border-gray-50 hover:shadow-md transition-shadow">
                  <Icon size={24} className={stat.color} />
                  <p className="text-2xl lg:text-3xl font-black text-gray-900 mt-3">{stat.value}</p>
                  <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* About / What is Nurq */}
        <section id="features" className="max-w-7xl mx-auto px-5 lg:px-8 py-16">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="relative order-2 lg:order-1">
              <div className="absolute -top-4 -right-4 w-48 h-48 bg-cyan-200/30 rounded-full blur-3xl" />
              <div className="relative">
                <img src={midwivesIllustration} alt="Care" className="w-full h-auto rounded-[2rem]" />
              </div>
            </div>
            <div className="space-y-6 order-1 lg:order-2">
              <h2 className="text-3xl lg:text-4xl font-black tracking-tight text-gray-900">
                What is Nurq?
              </h2>
              <p className="text-lg text-gray-600 leading-relaxed">
                {LANDING_COPY.about}
              </p>
              <div className="space-y-4">
                {FEATURES.map((feat, i) => {
                  const icons = [Brain, ShieldCheck, Clock];
                  const Icon = icons[i];
                  return (
                    <div key={i} className="flex gap-4 items-start">
                      <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <Icon size={20} className="text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{feat.title}</h3>
                        <p className="text-sm text-gray-500 mt-0.5">{feat.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="max-w-7xl mx-auto px-5 lg:px-8 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-black tracking-tight text-gray-900">How it works</h2>
            <p className="text-gray-500 mt-3 max-w-lg mx-auto">Four simple steps from symptom to appointment.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_IT_WORKS.map((item, i) => (
              <div key={i} className="relative bg-white rounded-2xl p-6 shadow-sm border border-gray-50 hover:shadow-md transition-shadow">
                <span className="text-4xl font-black text-blue-100">{item.step}</span>
                <h3 className="text-lg font-bold text-gray-900 mt-2">{item.title}</h3>
                <p className="text-sm text-gray-500 mt-2 leading-relaxed">{item.desc}</p>
                {i < 3 && (
                  <div className="hidden lg:block absolute top-1/2 -right-3 w-6 h-px bg-gray-200" />
                )}
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-7xl mx-auto px-5 lg:px-8 py-16">
          <div className="relative bg-gradient-to-br from-blue-600 to-cyan-500 rounded-[2rem] p-10 lg:p-16 overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-300/20 rounded-full blur-3xl" />
            <div className="relative text-center max-w-lg mx-auto">
              <h2 className="text-3xl lg:text-4xl font-black text-white">Ready to see Nurq in action?</h2>
              <p className="text-blue-100 mt-3">Start your intake now. It takes less than 3 minutes.</p>
              <button
                onClick={handleGetAppointment}
                className="group mt-6 bg-white text-blue-600 font-bold px-8 py-3.5 rounded-2xl hover:shadow-xl transition-all flex items-center gap-2 mx-auto"
              >
                Get Appointment
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="max-w-7xl mx-auto px-5 lg:px-8 py-10 border-t border-gray-100">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
                <img src={nurqLogo} alt="Nurq icon" width={40} height={40} />
              </div>
              <span className="font-black text-gray-900">Nurq</span>
            </div>
            <p className="text-sm text-gray-400">Smart medical intake. Product of mindburst.</p>
          </div>
        </footer>
      </div>
    </PageTransition>
  );
};
