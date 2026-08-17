import React from 'react';
import { Badge } from '../ui/Badge';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const normalized = (status || '').toUpperCase();

  let variant: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info' = 'default';

  switch (normalized) {
    case 'ACTIVE':
    case 'APPROVED':
    case 'ACCEPTED':
    case 'OPEN':
    case 'READY':
    case 'PASSED':
    case 'COMPLETED':
    case 'PRESENT':
      variant = 'success';
      break;

    case 'SUBMITTED':
    case 'IN_REVIEW':
    case 'PENDING':
    case 'DRAFT':
    case 'APPLICATION_OPEN':
    case 'LATE':
      variant = 'warning';
      break;

    case 'REJECTED':
    case 'FAILED':
    case 'CLOSED':
    case 'SUSPENDED':
    case 'WITHDRAWN':
    case 'ABSENT':
      variant = 'error';
      break;

    case 'INVITED':
    case 'REGISTERED':
    case 'ONLINE':
    case 'GRADED':
      variant = 'info';
      break;

    default:
      variant = 'default';
  }

  return (
    <Badge variant={variant} className={`text-[10px] uppercase font-bold tracking-wider ${className}`}>
      {normalized.replace(/_/g, ' ')}
    </Badge>
  );
};
