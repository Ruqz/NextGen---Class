import React from 'react';
import { cn, getRoleBadgeColor } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'orange' | 'success' | 'warning' | 'danger' | 'neutral' | 'role';
  roleName?: string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'neutral',
  roleName,
  size = 'md',
  children,
  ...props
}) => {
  if (variant === 'role' && roleName) {
    return (
      <span
        className={cn(
          'inline-flex items-center font-medium border rounded-full text-xs px-2.5 py-0.5',
          getRoleBadgeColor(roleName),
          className
        )}
        {...props}
      >
        {roleName}
      </span>
    );
  }

  const variants = {
    primary: 'bg-orange-50 text-orange-700 border-orange-200',
    orange: 'bg-orange-600 text-white border-transparent',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  const sizes = {
    sm: 'text-[11px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium border rounded-full whitespace-nowrap',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
