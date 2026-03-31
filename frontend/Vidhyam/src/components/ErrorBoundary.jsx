import React, { Component } from 'react';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service here
    console.error("Uncaught error in React Error Boundary:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-lg w-full border border-red-100">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="text-red-500 w-10 h-10" />
            </div>
            
            <h1 className="text-3xl font-bold text-gray-900 mb-3">Something went wrong</h1>
            <p className="text-gray-500 mb-8 max-w-sm mx-auto">
              We encountered an unexpected error while rendering this page. Our team has been notified.
            </p>

            {/* Optional: Show error details ONLY in development/if needed */}
            {(this.state.error && import.meta.env.DEV) && (
              <div className="bg-red-50 p-4 rounded-xl text-left mb-8 overflow-auto max-h-48 text-sm">
                <p className="font-mono text-red-800 break-words font-semibold">
                  {this.state.error.toString()}
                </p>
                <p className="font-mono text-red-600 break-words mt-2 whitespace-pre-wrap">
                  {this.state.errorInfo?.componentStack}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="flex items-center justify-center px-6 py-3 bg-red-50 text-red-700 font-semibold rounded-xl hover:bg-red-100 transition-colors"
              >
                <RefreshCw className="mr-2 w-5 h-5" />
                Reload Page
              </button>
              <button
                onClick={() => window.location.href = '/dashboard/home'}
                className="flex items-center justify-center px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
              >
                <Home className="mr-2 w-5 h-5" />
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
