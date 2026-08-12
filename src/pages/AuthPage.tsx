import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { Layers, Mail, Lock, User, ArrowRight } from 'lucide-react';

interface AuthPageProps {
  initialMode?: 'login' | 'register';
  onNavigate: (path: string) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ initialMode = 'login', onNavigate }) => {
  const { login, register, signInWithGoogle, error, setError, loading, demoLoginAs } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('Applicant');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password, displayName, selectedRole);
      }
      onNavigate('/portal');
    } catch (err) {
      // Handled inside AuthContext
    }
  };

  const roleOptions = [
    { value: 'Applicant', label: 'Applicant (Applying for Cohort 2)' },
    { value: 'Learner', label: 'Learner (Enrolled Student)' },
    { value: 'Facilitator', label: 'Facilitator / Instructor' },
    { value: 'Programme Manager', label: 'Programme Manager' },
    { value: 'M&E Manager', label: 'Monitoring & Evaluation Manager' },
    { value: 'Super Admin', label: 'Super Admin' },
  ];

  return (
    <div className="max-w-md mx-auto py-8">
      <Card variant="bordered-orange" className="p-6 md:p-8">
        <CardHeader className="text-center space-y-2 pb-6">
          <div className="w-12 h-12 rounded-xl bg-orange-600 text-white flex items-center justify-center mx-auto shadow-md">
            <Layers className="w-6 h-6" />
          </div>
          <CardTitle className="text-2xl">
            {mode === 'login' ? 'Sign In to NextGen PRO' : 'Create Platform Account'}
          </CardTitle>
          <CardDescription className="text-xs">
            {mode === 'login'
              ? 'Enter your credentials to access your portal area'
              : 'Register to apply for Cohort 2 or manage platform resources'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <Alert type="error" onDismiss={() => setError(null)}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <Input
                  label="Full Name"
                  placeholder="e.g. Alex Morgan"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  leftIcon={<User className="w-4 h-4" />}
                  required
                />

                <Select
                  label="Requested Platform Role"
                  options={roleOptions}
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                  helperText="Select your primary stakeholder persona"
                  required
                />
              </>
            )}

            <Input
              label="Email Address"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4" />}
              required
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="w-4 h-4" />}
              required
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full justify-center mt-2"
              isLoading={loading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              {mode === 'login' ? 'Sign In' : 'Complete Registration'}
            </Button>
          </form>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-400 font-medium">Or continue with</span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full justify-center"
            onClick={async () => {
              try {
                await signInWithGoogle(selectedRole);
                onNavigate('/portal');
              } catch (e) {}
            }}
          >
            Google Authentication
          </Button>

          <div className="pt-4 border-t border-slate-100 text-center text-xs">
            {mode === 'login' ? (
              <p className="text-slate-600">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setMode('register');
                  }}
                  className="font-semibold text-orange-600 hover:underline cursor-pointer"
                >
                  Register here
                </button>
              </p>
            ) : (
              <p className="text-slate-600">
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setMode('login');
                  }}
                  className="font-semibold text-orange-600 hover:underline cursor-pointer"
                >
                  Sign in here
                </button>
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
