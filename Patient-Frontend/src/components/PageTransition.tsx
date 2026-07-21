import React, { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

export const PageTransition: React.FC<{ children: ReactNode }> = ({ children }) => {
  const location = useLocation();

  return (
    <div
      key={location.pathname}
      className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out"
    >
      {children}
    </div>
  );
};
