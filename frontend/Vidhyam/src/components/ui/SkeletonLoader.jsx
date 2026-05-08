import React from 'react';

const SkeletonLoader = ({ type = 'card', count = 1, className = '' }) => {
  const renderSkeleton = () => {
    switch (type) {
      case 'card':
        return (
          <div className={`glass-card p-5 ${className}`}>
            <div className="flex justify-between items-start mb-3">
              <div className="space-y-2">
                <div className="h-3 w-16 bg-white/[0.04] rounded-md skeleton" />
                <div className="h-7 w-28 bg-white/[0.04] rounded-md skeleton" />
              </div>
              <div className="h-10 w-10 bg-white/[0.04] rounded-xl skeleton" />
            </div>
          </div>
        );
      case 'list':
        return (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.015] border border-white/[0.03]">
                <div className="w-10 h-10 rounded-xl bg-white/[0.04] shrink-0 skeleton" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 bg-white/[0.04] rounded-md skeleton" />
                  <div className="h-3 w-1/2 bg-white/[0.04] rounded-md skeleton" />
                </div>
              </div>
            ))}
          </div>
        );
      case 'text':
      default:
        return <div className={`h-4 w-full bg-white/[0.04] rounded-md skeleton ${className}`} />;
    }
  };

  return (
    <>
      {Array.from({ length: count }).map((_, idx) => (
        <React.Fragment key={idx}>{renderSkeleton()}</React.Fragment>
      ))}
    </>
  );
};

export default SkeletonLoader;
