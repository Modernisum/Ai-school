import React, { lazy, Suspense } from 'react';
import { EnhancedPageLoader, ErrorState } from '../components/ui/LoadingStates';

/**
 * Enhanced Lazy Loading Utilities
 * Provides better error handling, retry logic, and prefetching
 */

// Enhanced lazy with retry and error boundary
export const lazyWithRetry = (componentImport, options = {}) => {
  const { 
    retries = 3, 
    retryDelay = 1000,
    onError,
    fallback: Fallback 
  } = options;

  return lazy(() => {
    const loadComponent = async (attempt = 0) => {
      try {
        return await componentImport();
      } catch (error) {
        if (attempt < retries) {
          console.warn(`Lazy loading attempt ${attempt + 1} failed, retrying...`, error);
          
          // Call error handler if provided
          if (onError) {
            onError(error, attempt);
          }
          
          // Wait before retry with exponential backoff
          await new Promise(resolve => 
            setTimeout(resolve, retryDelay * Math.pow(2, attempt))
          );
          
          return loadComponent(attempt + 1);
        }
        
        // Final attempt failed
        console.error('Lazy loading failed after all retries:', error);
        throw error;
      }
    };

    return loadComponent();
  });
};

// Component wrapper with error boundary and loading state
export const LazyComponent = ({ 
  component, 
  fallback,
  errorComponent,
  onError,
  ...props 
}) => {
  const LazyComponent = component;
  const Fallback = fallback || <EnhancedPageLoader />;
  const ErrorComponent = errorComponent || (({ error, retry }) => (
    <ErrorState 
      title="Failed to load component"
      description="There was an error loading this part of the application."
      error={error}
      onRetry={retry}
    />
  ));

  const [hasError, setHasError] = React.useState(false);
  const [error, setError] = React.useState(null);

  const handleRetry = () => {
    setHasError(false);
    setError(null);
  };

  if (hasError) {
    return <ErrorComponent error={error} retry={handleRetry} />;
  }

  return (
    <ErrorBoundary
      onError={(error) => {
        setHasError(true);
        setError(error);
        if (onError) onError(error);
      }}
      fallback={null}
    >
      <Suspense fallback={Fallback}>
        <LazyComponent {...props} />
      </Suspense>
    </ErrorBoundary>
  );
};

// Simple error boundary component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    if (this.props.onError) {
      this.props.onError(error);
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-8 text-center">
          <h3 className="text-lg font-semibold text-red-400 mb-2">Something went wrong</h3>
          <p className="text-slate-400 mb-4">Please try refreshing the page.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Prefetch utility for critical components
export const prefetchComponent = (componentImport) => {
  if (typeof window !== 'undefined') {
    // Start prefetching in idle time
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => {
        componentImport().catch(() => {
          // Silently fail prefetch
        });
      });
    } else {
      // Fallback to setTimeout
      setTimeout(() => {
        componentImport().catch(() => {
          // Silently fail prefetch
        });
      }, 1000);
    }
  }
};

// Route-based lazy loading with prefetching
export const createLazyRoute = (componentImport, options = {}) => {
  const { 
    prefetch = true,
    prefetchOnHover = true,
    ...lazyOptions 
  } = options;

  const LazyRouteComponent = lazyWithRetry(componentImport, lazyOptions);

  // Create wrapper component with prefetching
  const RouteComponent = React.forwardRef((props, ref) => {
    const [isPrefetched, setIsPrefetched] = React.useState(false);

    React.useEffect(() => {
      if (prefetch && !isPrefetched) {
        prefetchComponent(componentImport);
        setIsPrefetched(true);
      }
    }, [prefetch, isPrefetched]);

    const handleMouseEnter = () => {
      if (prefetchOnHover && !isPrefetched) {
        prefetchComponent(componentImport);
        setIsPrefetched(true);
      }
    };

    return (
      <div onMouseEnter={handleMouseEnter}>
        <LazyComponent 
          component={LazyRouteComponent}
          {...props}
          ref={ref}
        />
      </div>
    );
  });

  RouteComponent.displayName = 'LazyRoute';

  return RouteComponent;
};

// Module federation helper for larger applications
export const createFederatedComponent = (remoteUrl, scope, module) => {
  return lazyWithRetry(async () => {
    // Initialize the share scope if needed
    await __webpack_init_sharing__('default');
    
    const container = window[scope];
    
    // Initialize the container if it hasn't been initialized
    await container.init(__webpack_share_scopes__.default);
    
    const factory = await container.get(module);
    return factory();
  }, {
    retries: 5,
    retryDelay: 2000,
    onError: (error) => {
      console.error('Failed to load federated module:', error);
    }
  });
};

// Utility to measure loading performance
export const withLoadingMetrics = (componentImport, componentName) => {
  return lazyWithRetry(async () => {
    const startTime = performance.now();
    
    try {
      const module = await componentImport();
      const endTime = performance.now();
      
      // Log loading time for performance monitoring
      console.log(`[Perf] ${componentName} loaded in ${Math.round(endTime - startTime)}ms`);
      
      return module;
    } catch (error) {
      const endTime = performance.now();
      console.error(`[Perf] ${componentName} failed after ${Math.round(endTime - startTime)}ms:`, error);
      throw error;
    }
  });
};

export default {
  lazyWithRetry,
  LazyComponent,
  ErrorBoundary,
  prefetchComponent,
  createLazyRoute,
  createFederatedComponent,
  withLoadingMetrics
};