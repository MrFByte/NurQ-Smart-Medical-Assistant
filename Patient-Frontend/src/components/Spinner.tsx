import React from 'react';

export const Spinner: React.FC<{ size?: 'sm' | 'md' | 'lg', className?: string }> = ({ size = 'md', className = '' }) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <div className={`flex items-center justify-center space-x-1.5 ${className}`}>
      <div className={`${sizes[size]} rounded-full bg-blue-500 animate-bounce`} style={{ animationDelay: '0ms' }} />
      <div className={`${sizes[size]} rounded-full bg-blue-500 animate-bounce`} style={{ animationDelay: '150ms' }} />
      <div className={`${sizes[size]} rounded-full bg-blue-500 animate-bounce`} style={{ animationDelay: '300ms' }} />
    </div>
  );
};
