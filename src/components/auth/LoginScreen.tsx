import { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Checkbox } from '../ui/checkbox';
import { login } from '../../lib/api/auth';
import { saveSession } from '../../lib/storage/session';

interface LoginScreenProps {
  onBack: () => void;
  onLogin: (user: { id: string; email: string; firstName?: string; lastName?: string }) => void;
  onSignUp: () => void;
  onForgotPassword: () => void;
  onError?: (message: string) => void;
}

export function LoginScreen({ onBack, onLogin, onSignUp, onForgotPassword, onError }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await login({ email, password, rememberMe });
      saveSession({ tokens: res.tokens, sessionId: res.sessionId }, rememberMe);
      onLogin(res.user);
    } catch (err: any) {
      const message = err?.message || 'Login failed';
      onError?.(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="p-4">
        <button
          onClick={onBack}
          className="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-gray-700" />
        </button>
      </div>

      <div className="flex-1 px-6 pt-8">
        <h1 className="text-gray-900 mb-2">Welcome Back</h1>
        <p className="text-gray-600 mb-8">Sign in to continue trading</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm text-gray-700 mb-2">
              Email or Phone
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                id="email"
                type="email"
                placeholder="Enter your email or phone"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-12 rounded-lg text-gray-700"
                inputMode="email"
                autoComplete="username"
                enterKeyHint="go"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10 h-12 rounded-lg text-gray-700"
                autoComplete="current-password"
                enterKeyHint="done"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked as boolean)}
              />
              <label htmlFor="remember" className="text-sm text-gray-700 cursor-pointer">
                Remember me
              </label>
            </div>

            <button
              type="button"
              onClick={onForgotPassword}
              className="text-sm text-blue-700 hover:text-blue-800"
            >
              Forgot Password?
            </button>
          </div>

          <Button
            type="submit"
            className="w-full h-12 bg-blue-700 hover:bg-blue-800 text-white rounded-lg mt-6"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Sign In'
            )}
          </Button>
        </form>

        <div className="mt-8" />
      </div>

      <div className="p-6 text-center">
        <p className="text-gray-600">
          Don't have an account?{' '}
          <button
            onClick={onSignUp}
            className="text-blue-700 hover:text-blue-800"
          >
            Create Account
          </button>
        </p>
      </div>
    </div>
  );
}
