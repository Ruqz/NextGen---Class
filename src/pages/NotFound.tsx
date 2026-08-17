import React from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { FileQuestion, Home as HomeIcon } from 'lucide-react';

interface NotFoundProps {
  onNavigate: (path: string) => void;
}

export const NotFound: React.FC<NotFoundProps> = ({ onNavigate }) => {
  return (
    <div className="max-w-md mx-auto py-12 text-center">
      <Card className="p-8 space-y-4">
        <div className="w-12 h-12 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center mx-auto">
          <FileQuestion className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Page Not Found</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          The requested path does not exist on the NextGen Class platform.
        </p>
        <div className="pt-2">
          <Button
            variant="primary"
            leftIcon={<HomeIcon className="w-4 h-4" />}
            onClick={() => onNavigate('/')}
            className="w-full justify-center"
          >
            Go to Platform Home
          </Button>
        </div>
      </Card>
    </div>
  );
};
