import { createBrowserRouter } from 'react-router-dom';
import { LandingPage } from '@/pages/landing/LandingPage';
import { PatientTypePage } from '@/pages/patient-type/PatientTypePage';
import { RegisterPage } from '@/pages/register/RegisterPage';
import { LookupPage } from '@/pages/lookup/LookupPage';
import { ChiefComplaintPage } from '@/pages/complaint/ChiefComplaintPage';
import { EmergencyPage } from '@/pages/emergency/EmergencyPage';
import { AppointmentPage } from '@/pages/appointment/AppointmentPage';
import { IntakePage } from '@/pages/intake/IntakePage';
import { CompletePage } from '@/pages/complete/CompletePage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/patient-type',
    element: <PatientTypePage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/lookup',
    element: <LookupPage />,
  },
  {
    path: '/complaint',
    element: <ChiefComplaintPage />,
  },
  {
    path: '/emergency',
    element: <EmergencyPage />,
  },
  {
    path: '/appointment',
    element: <AppointmentPage />,
  },
  {
    path: '/intake',
    element: <IntakePage />,
  },
  {
    path: '/complete',
    element: <CompletePage />,
  },
]);
