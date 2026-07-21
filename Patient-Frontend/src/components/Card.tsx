import React, { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick, hoverable = false }) => {
  const baseStyles = 'bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100';
  const hoverStyles = hoverable ? 'hover:shadow-xl hover:border-blue-100 transition-all cursor-pointer' : '';

  return (
    <div
      onClick={onClick}
      className={`${baseStyles} ${hoverStyles} ${className}`}
    >
      {children}
    </div>
  );
};
