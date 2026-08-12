import React from 'react';
import { cn } from '../../lib/utils';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  type?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  onDismiss?: () => void;
}

export const Alert: React.FC<AlertProps> = ({
  type = 'info',
  title,
  children,
  className,
  onDismiss,
  ...props
}) => {
  const styles = {
    info: 'bg-blue-50 border-blue-200 text-blue-900 icon:text-blue-600',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-900 icon:text-emerald-600',
    warning: 'bg-amber-50 border-amber-200 text-amber-900 icon:text-amber-600',
    error: 'bg-rose-50 border-rose-200 text-rose-900 icon:text-rose-600',
  };

  const icons = {
    info: <Info className="w-5 h-5 text-blue-600 shrink-0" />,
    success: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />,
  };

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-lg border text-sm',
        styles[type],
        className
      )}
      role="alert"
      {...props}
    >
      {icons[type]}
      <div className="flex-1">
        {title && <h4 className="font-semibold mb-0.5">{title}</h4>}
        <div className="text-xs leading-relaxed opacity-90">{children}</div>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="p-1 -mr-1 -mt-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-black/5"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
