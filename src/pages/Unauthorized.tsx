import React from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ShieldAlert, ArrowLeft, LogIn, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface UnauthorizedProps {
  onNavigate: (path: string) => void;
  customMessage?: string;
}

export const Unauthorized: React.FC<UnauthorizedProps> = ({ onNavigate, customMessage }) => {
  const { accountType, logout } = useAuth();

  const handleReturnToPortal = () => {
    if (accountType === 'APPLICANT') onNavigate('/applicant/dashboard');
    else if (accountType === 'LEARNER') onNavigate('/learner/dashboard');
    else if (accountType === 'STAFF') onNavigate('/staff/dashboard');
    else onNavigate('/');
  };

  return (
    <div className="max-w-md mx-auto py-12 text-center">
      <Card className="p-8 space-y-4 border-2 border-red-200 bg-red-50/20">
        <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-black text-slate-900">Access Restricted</h2>
        <p className="text-xs text-slate-600 leading-relaxed font-medium">
          {customMessage ||
            'You do not have the required permissions, account type, or role assignment to view this platform area.'}
        </p>

        <div className="pt-4 space-y-2">
          <Button
            variant="primary"
            leftIcon={<UserCheck className="w-4 h-4" />}
            onClick={handleReturnToPortal}
            className="w-full justify-center bg-slate-900 hover:bg-slate-800 text-white"
          >
            Go to Authorized Dashboard
          </Button>

          <Button
            variant="outline"
            leftIcon={<LogIn className="w-4 h-4" />}
            onClick={async () => {
              await logout();
              onNavigate('/login/applicant');
            }}
            className="w-full justify-center bg-white text-slate-700 hover:bg-slate-100"
          >
            Switch Account / Sign In
          </Button>

          <Button
            variant="ghost"
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => onNavigate('/')}
            className="w-full justify-center text-slate-500 hover:text-slate-700 text-xs"
          >
            Return to Home Page
          </Button>
        </div>
      </Card>
    </div>
  );
};

