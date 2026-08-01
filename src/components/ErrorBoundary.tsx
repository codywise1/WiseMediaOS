import React from 'react';

interface Props {
  children: React.ReactNode;
  label?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.label ? `: ${this.props.label}` : ''}]`, error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
          <div className="glass-card rounded-2xl p-6 sm:p-8 max-w-lg w-full border border-red-500/20">
            <h2 className="text-red-400 font-bold text-xl mb-3">
              {this.props.label ? `${this.props.label} failed to load` : 'Something went wrong'}
            </h2>
            <pre className="text-sm text-gray-300 bg-black/30 rounded-lg p-4 overflow-auto max-h-48 mb-4 whitespace-pre-wrap break-words">
              {this.state.error?.message || 'Unknown error'}
            </pre>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 rounded-lg bg-[#3aa3eb] text-white text-sm font-semibold hover:bg-[#2d8bc7] transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
