import React from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  label?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className, label }) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  if (!label) {
    return <Loader2 className={cn('animate-spin text-orange-600', sizes[size], className)} />;
  }

  return (
    <div className="flex flex-col items-center justify-center gap-2 p-4">
      <Loader2 className={cn('animate-spin text-orange-600', sizes[size], className)} />
      <span className="text-xs font-medium text-slate-500">{label}</span>
    </div>
  );
};
