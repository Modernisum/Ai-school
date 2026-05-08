import React from 'react';
import { motion } from 'framer-motion';
import { 
  Loader2, Cloud, Database, Server, Users, 
  FileText, CreditCard, School, BarChart3 
} from 'lucide-react';

/**
 * Enhanced Loading Components
 * Provides various loading states for different scenarios
 */

// Progress indicator for long operations
export const ProgressLoader = ({ progress, label, showPercentage = true }) => {
  return (
    <div className="w-full max-w-md p-6">
      {label && (
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-[var(--text-main)]">{label}</span>
          {showPercentage && (
            <span className="text-sm font-bold text-[var(--primary-color)]">
              {Math.round(progress)}%
            </span>
          )}
        </div>
      )}
      <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="h-full bg-gradient-to-r from-[var(--primary-color)] to-[var(--secondary-color)] rounded-full"
        />
      </div>
    </div>
  );
};

// Skeleton loading for data grids
export const DataGridSkeleton = ({ rows = 5, columns = 4, showHeader = true }) => {
  return (
    <div className="w-full overflow-hidden">
      {showHeader && (
        <div className="grid grid-cols-4 gap-4 mb-4">
          {Array.from({ length: columns }).map((_, i) => (
            <div key={`header-${i}`} className="h-4 bg-white/10 rounded animate-pulse" />
          ))}
        </div>
      )}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="grid grid-cols-4 gap-4">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <div
                key={`cell-${rowIndex}-${colIndex}`}
                className="h-6 bg-white/5 rounded animate-pulse"
                style={{ 
                  animationDelay: `${(rowIndex * 0.1) + (colIndex * 0.05)}s`,
                  animationDuration: '1.5s'
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

// Content placeholder with icon
export const ContentPlaceholder = ({ 
  icon: Icon = FileText, 
  title, 
  description, 
  action 
}) => {
  return (
    <div className="text-center py-12 px-4">
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-white/5 to-transparent flex items-center justify-center">
        <Icon className="w-8 h-8 text-[var(--text-muted)]" />
      </div>
      {title && (
        <h3 className="text-lg font-semibold text-[var(--text-main)] mb-2">
          {title}
        </h3>
      )}
      {description && (
        <p className="text-[var(--text-muted)] mb-6 max-w-md mx-auto">
          {description}
        </p>
      )}
      {action}
    </div>
  );
};

// Loading overlay with blur
export const LoadingOverlay = ({ 
  isLoading, 
  message = 'Loading...',
  transparent = false 
}) => {
  if (!isLoading) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`fixed inset-0 z-50 flex items-center justify-center ${
        transparent ? 'bg-black/40 backdrop-blur-sm' : 'bg-[var(--bg-main)]/90 backdrop-blur-lg'
      }`}
    >
      <div className="text-center">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-white/10 rounded-full"></div>
          <div className="absolute inset-0 w-16 h-16 border-4 border-t-[var(--primary-color)] rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-[var(--primary-color)] animate-spin" />
          </div>
        </div>
        <p className="mt-4 text-[var(--text-main)] font-medium">{message}</p>
      </div>
    </motion.div>
  );
};

// Shimmer effect component
export const Shimmer = ({ width = 'full', height = '20px', className = '' }) => {
  return (
    <div 
      className={`relative overflow-hidden bg-white/5 rounded ${className}`}
      style={{ width, height }}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  );
};

// Enhanced page loader with module indicators
export const EnhancedPageLoader = ({ module = 'general' }) => {
  const moduleConfigs = {
    students: {
      icon: Users,
      title: 'Loading Student Data',
      description: 'Fetching student records and attendance information...',
      steps: ['Database', 'Attendance', 'Grades']
    },
    employees: {
      icon: Users,
      title: 'Loading Employee Data',
      description: 'Fetching staff records and payroll information...',
      steps: ['Database', 'Payroll', 'Attendance']
    },
    finance: {
      icon: CreditCard,
      title: 'Loading Financial Data',
      description: 'Processing financial records and transactions...',
      steps: ['Transactions', 'Reports', 'Analytics']
    },
    academic: {
      icon: School,
      title: 'Loading Academic Data',
      description: 'Fetching course schedules and examination data...',
      steps: ['Schedule', 'Exams', 'Results']
    },
    general: {
      icon: Database,
      title: 'Loading Application',
      description: 'Initializing modules and loading data...',
      steps: ['Authentication', 'Database', 'Interface']
    }
  };

  const config = moduleConfigs[module] || moduleConfigs.general;
  const Icon = config.icon;

  return (
    <div className="fixed inset-0 bg-[var(--bg-main)] flex items-center justify-center z-50">
      <div className="max-w-md w-full p-8 text-center">
        <div className="relative mx-auto w-24 h-24 mb-6">
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--primary-color)] to-[var(--secondary-color)] rounded-full blur-xl opacity-20"></div>
          <div className="relative w-24 h-24 border-4 border-white/10 rounded-full flex items-center justify-center">
            <div className="w-20 h-20 border-4 border-t-[var(--primary-color)] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
            <Icon className="absolute w-10 h-10 text-[var(--primary-color)]" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-[var(--text-main)] mb-2">
          {config.title}
        </h2>
        <p className="text-[var(--text-muted)] mb-8">
          {config.description}
        </p>

        <div className="space-y-4">
          {config.steps.map((step, index) => (
            <div key={step} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  index === 0 
                    ? 'bg-[var(--primary-color)] text-white' 
                    : 'bg-white/5 text-[var(--text-muted)]'
                }`}>
                  {index + 1}
                </div>
                <span className={`font-medium ${
                  index === 0 
                    ? 'text-[var(--text-main)]' 
                    : 'text-[var(--text-muted)]'
                }`}>
                  {step}
                </span>
              </div>
              {index === 0 && (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-[var(--primary-color)] animate-ping"></div>
                  <span className="text-xs font-bold text-[var(--primary-color)] uppercase">
                    Loading...
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 pt-6 border-t border-white/10">
          <div className="text-xs text-[var(--text-muted)]">
            Please wait while we prepare your dashboard
          </div>
        </div>
      </div>
    </div>
  );
};

// Inline loading indicator
export const InlineLoader = ({ size = 'sm', text = 'Loading...' }) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`${sizes[size]} border-2 border-white/10 border-t-[var(--primary-color)] rounded-full animate-spin`}></div>
      {text && <span className="text-sm text-[var(--text-muted)]">{text}</span>}
    </div>
  );
};

// Error state component
export const ErrorState = ({ 
  title = 'Something went wrong', 
  description,
  error,
  onRetry 
}) => {
  return (
    <div className="text-center py-12 px-4">
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-500/10 flex items-center justify-center">
        <svg className="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-[var(--text-main)] mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-[var(--text-muted)] mb-4 max-w-md mx-auto">
          {description}
        </p>
      )}
      {error && (
        <div className="mb-6 p-3 bg-white/5 rounded-lg max-w-md mx-auto">
          <code className="text-xs text-red-400 font-mono break-all">
            {error.message || String(error)}
          </code>
        </div>
      )}
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-6 py-2 bg-[var(--primary-color)] text-white font-semibold rounded-xl hover:bg-[var(--primary-color)]/90 transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  );
};

// Empty state component
export const EmptyState = ({ 
  icon: Icon = FileText, 
  title = 'No data available', 
  description,
  action 
}) => {
  return (
    <div className="text-center py-12 px-4">
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-white/5 to-transparent flex items-center justify-center">
        <Icon className="w-8 h-8 text-[var(--text-muted)]" />
      </div>
      <h3 className="text-lg font-semibold text-[var(--text-main)] mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-[var(--text-muted)] mb-6 max-w-md mx-auto">
          {description}
        </p>
      )}
      {action}
    </div>
  );
};

export default {
  ProgressLoader,
  DataGridSkeleton,
  ContentPlaceholder,
  LoadingOverlay,
  Shimmer,
  EnhancedPageLoader,
  InlineLoader,
  ErrorState,
  EmptyState
};