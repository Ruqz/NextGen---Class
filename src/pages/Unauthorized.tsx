import React from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

interface UnauthorizedProps {
  onNavigate: (path: string) => void;
}

export const Unauthorized: React.FC<UnauthorizedProps> = ({ onNavigate }) => {
  return (
    <div className="max-w-md mx-auto py-12 text-center">
      <Card className="p-8 space-y-4">
        <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Access Restricted</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          You do not have the required permissions or role assignment to view this area.
        </p>
        <div className="pt-2">
          <Button
            variant="outline"
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => onNavigate('/')}
            className="w-full justify-center"
          >
            Return to Public Home
          </Button>
        </div>
      </Card>
    </div>
  );
};
