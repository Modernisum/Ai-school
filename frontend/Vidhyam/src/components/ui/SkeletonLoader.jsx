import React from 'react';

const SkeletonLoader = ({ type = 'card', count = 1, className = '' }) => {
  const renderSkeleton = () => {
    switch (type) {
      case 'card':
        return (
          <div className={`glass-card p-6 animate-pulse ${className}`}>
            <div className="flex justify-between items-start mb-4">
              <div className="space-y-2">
                <div className="h-3 w-20 bg-slate-700/50 rounded-md"></div>
                <div className="h-8 w-32 bg-slate-700/50 rounded-md mt-2"></div>
                <div className="h-3 w-40 bg-slate-700/50 rounded-md mt-3"></div>
              </div>
              <div className="h-12 w-12 bg-slate-700/50 rounded-2xl"></div>
            </div>
          </div>
        );
      case 'chart':
        return (
           <div className={`glass-card p-6 min-h-[440px] flex flex-col animate-pulse ${className}`}>
             <div className="flex justify-between items-center mb-8">
                <div className="space-y-2">
                   <div className="h-3 w-24 bg-slate-700/50 rounded-md"></div>
                   <div className="h-6 w-48 bg-slate-700/50 rounded-md"></div>
                </div>
                <div className="h-10 w-10 bg-slate-700/50 rounded-xl"></div>
             </div>
             <div className="flex-1 w-full flex items-end gap-3 justify-center pt-10">
                {[...Array(5)].map((_, i) => (
                   <div key={i} className="flex-1 bg-slate-700/30 rounded-t-md" style={{ height: `${Math.max(20, Math.random() * 80)}%` }}></div>
                ))}
             </div>
           </div>
        );
      case 'list':
        return (
          <div className="space-y-3">
             {[...Array(3)].map((_, i) => (
                <div key={i} className="p-4 rounded-xl bg-slate-700/20 animate-pulse flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-700/50 flex-shrink-0"></div>
                  <div className="flex-1 space-y-2">
                     <div className="h-4 w-1/3 bg-slate-700/50 rounded-md"></div>
                     <div className="h-3 w-1/2 bg-slate-700/50 rounded-md"></div>
                  </div>
                </div>
             ))}
          </div>
        );
      case 'text':
      default:
        return <div className={`h-4 w-full bg-slate-700/50 rounded-md animate-pulse ${className}`}></div>;
    }
  };

  return (
    <>
      {Array.from({ length: count }).map((_, idx) => (
        <React.Fragment key={idx}>
          {renderSkeleton()}
        </React.Fragment>
      ))}
    </>
  );
};

export default SkeletonLoader;
