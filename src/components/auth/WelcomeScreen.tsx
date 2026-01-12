import { TrendingUp } from 'lucide-react';
import { Button } from '../ui/button';
import { brand } from '../../lib/brand';

interface WelcomeScreenProps {
  onSignIn: () => void;
  onSignUp: () => void;
}

export function WelcomeScreen({ onSignIn, onSignUp }: WelcomeScreenProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-700 via-blue-800 to-blue-900 flex flex-col items-center justify-between p-6 text-white">
      <div className="flex-1 flex flex-col items-center justify-center max-w-md w-full">
        <div className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-6 animate-fade-in">
          <TrendingUp className="w-10 h-10 text-white" strokeWidth={2.5} />
        </div>
        
        <h1 className="text-center mb-3 animate-fade-in" style={{ animationDelay: '100ms' }}>
          {brand.name}
        </h1>
        
        <p className="text-center text-blue-100 text-lg mb-12 animate-fade-in" style={{ animationDelay: '200ms' }}>
          {brand.tagline}
        </p>

        <div className="w-full space-y-3 animate-fade-in" style={{ animationDelay: '300ms' }}>
          <Button
            onClick={onSignUp}
            className="w-full h-12 bg-white text-blue-700 hover:bg-blue-50 rounded-full"
          >
            Create Account
          </Button>
          
          <Button
            onClick={onSignIn}
            variant="outline"
            className="w-full h-12 bg-transparent border-2 border-white text-white hover:bg-white/10 rounded-full"
          >
            Sign In
          </Button>
        </div>
      </div>

      <p className="text-blue-200 text-xs text-center max-w-sm animate-fade-in" style={{ animationDelay: '400ms' }}>
        Trading forex involves risk. Only trade with money you can afford to lose. 
        CFDs are complex instruments and come with a high risk of losing money.
      </p>
    </div>
  );
}
