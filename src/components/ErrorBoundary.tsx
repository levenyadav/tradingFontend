import React from 'react';

type Props = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  label?: string;
  onError?: (info: { error: Error; label?: string; stack?: string }) => void;
};

type State = {
  hasError: boolean;
};

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, info: any) {
    try {
      const stack = (error && error.stack) || (info && info.componentStack) || undefined;
      if (this.props.onError) this.props.onError({ error, label: this.props.label, stack });
      else console.error('ErrorBoundary', { label: this.props.label, error, stack });
    } catch {}
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="max-w-sm w-full bg-white border rounded-xl p-6 text-center">
            <h2 className="text-gray-900 text-lg font-semibold mb-2">Something went wrong</h2>
            <p className="text-gray-600 mb-4">Please try again or reload the app.</p>
            <button
              className="h-11 px-4 rounded-lg bg-blue-600 text-white"
              onClick={() => {
                this.setState({ hasError: false });
                location.reload();
              }}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
