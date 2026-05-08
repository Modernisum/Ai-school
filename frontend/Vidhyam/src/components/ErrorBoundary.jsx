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
      const isChunkError = this.state.error?.name === 'ChunkLoadError' || 
                          (this.state.error instanceof TypeError && this.state.error.message.includes('fetch'));

      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-slate-200 selection:bg-primary/30">
          <div className="glass-card p-10 rounded-[2.5rem] max-w-xl w-full border border-white/10 shadow-2xl relative overflow-hidden bg-slate-900/50 backdrop-blur-xl">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-50" />
             
            <div className="w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner">
              <AlertTriangle className="text-red-400 w-10 h-10" />
            </div>
            
            <h1 className="text-3xl font-black text-white mb-4 tracking-tight">
              {isChunkError ? 'Synchronization Lost' : 'Neural Link Interrupted'}
            </h1>
            <p className="text-slate-400 mb-10 max-w-sm mx-auto font-medium text-sm leading-relaxed">
              {isChunkError 
                ? 'We were unable to download a part of the app. This usually happens if the connection was lost or the server restarted.' 
                : 'A critical system error has occurred in the interface layer. Use the controls below to restore connectivity.'}
            </p>

            {/* Error Detail (Dev Only) */}
            {import.meta.env.DEV && (
              <div className="bg-slate-950/80 border border-white/5 p-5 rounded-2xl text-left mb-10 overflow-auto max-h-48 text-[10px] font-mono custom-scrollbar">
                <p className="text-red-400 font-black mb-2 uppercase tracking-widest">Diagnostic Report:</p>
                <p className="text-slate-500 break-words mb-2">
                  {this.state.error?.toString()}
                </p>
                <div className="text-slate-600 mt-2 border-t border-white/5 pt-2">
                   {this.state.errorInfo?.componentStack}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => window.location.reload(true)}
                className="flex items-center justify-center px-8 py-4 bg-blue-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
              >
                <RefreshCw className="mr-3 w-4 h-4" />
                Synchronize App
              </button>
              <button
                onClick={() => window.location.href = '/dashboard/home'}
                className="flex items-center justify-center px-8 py-4 bg-white/5 border border-white/10 text-slate-300 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-white/10 transition-all active:scale-95"
              >
                <Home className="mr-3 w-4 h-4" />
                Return Home
              </button>
            </div>
          </div>
          
          <style>{`
            .glass-card::before {
              content: "";
              position: absolute;
              top: 0; left: 0; right: 0; bottom: 0;
              background: radial-gradient(circle at top right, rgba(59, 130, 246, 0.05), transparent);
              pointer-events: none;
            }
            .custom-scrollbar::-webkit-scrollbar { width: 4px; }
            .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
