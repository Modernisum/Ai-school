import React from 'react';

const PageLoader = ({ fullScreen = false }) => (
  <div className={`w-full flex-col items-center justify-center flex ${fullScreen ? 'h-screen bg-slate-950' : 'h-[calc(100vh-100px)]'}`}>
    <div className="w-12 h-12 border-4 rounded-full animate-spin" style={{ borderColor: 'rgba(99, 102, 241, 0.1)', borderTopColor: 'var(--primary-color, #6366f1)' }}></div>
    <div className="mt-4 flex items-center gap-3">
       <span className="w-2 h-2 rounded-full bg-primary animate-ping"></span>
       <p className="text-slate-400 font-bold uppercase tracking-widest text-xs animate-pulse">Initializing Interface...</p>
    </div>
  </div>
);

export default PageLoader;
