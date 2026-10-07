import { createBrowserRouter, useRouteError } from 'react-router-dom';
import { LandingPage } from '@/pages/landing/LandingPage';
import { PatientTypePage } from '@/pages/patient-type/PatientTypePage';
import { RegisterPage } from '@/pages/register/RegisterPage';
import { LookupPage } from '@/pages/lookup/LookupPage';
import { ChiefComplaintPage } from '@/pages/complaint/ChiefComplaintPage';
import { EmergencyPage } from '@/pages/emergency/EmergencyPage';
import { AppointmentPage } from '@/pages/appointment/AppointmentPage';
import { IntakePage } from '@/pages/intake/IntakePage';
import { CompletePage } from '@/pages/complete/CompletePage';

/** 
 * Bubbles React Router errors (like 404s from missing loaders) up to our custom ErrorBoundary.
 */
function RouterErrorBubble(): never {
  const error = useRouteError() as any;
  if (error?.status === 404) {
    throw new Error('404: Page Not Found');
  }
  throw error || new Error('Unknown routing error');
}

/** 
 * Throws a 404 error directly when the user hits a route that doesn't exist (the '*' path).
 */
function NotFoundBubble(): never {
  throw new Error('404: Page Not Found');
}

export const router = createBrowserRouter([
  {
    path: '/',
    errorElement: <RouterErrorBubble />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: 'patient-type', element: <PatientTypePage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: 'lookup', element: <LookupPage /> },
      { path: 'complaint', element: <ChiefComplaintPage /> },
      { path: 'emergency', element: <EmergencyPage /> },
      { path: 'appointment', element: <AppointmentPage /> },
      { path: 'intake', element: <IntakePage /> },
      { path: 'complete', element: <CompletePage /> },
      { path: '*', element: <NotFoundBubble /> }
    ]
  }
]);
