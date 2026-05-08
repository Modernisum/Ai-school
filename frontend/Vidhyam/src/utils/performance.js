/**
 * Performance Monitoring Utilities
 * Track and optimize application performance
 */

// Performance metrics storage
const performanceMetrics = {
  pageLoadTimes: {},
  componentLoadTimes: {},
  apiResponseTimes: {},
  userInteractions: []
};

// Start tracking a performance metric
export const startMetric = (name) => {
  if (typeof window !== 'undefined' && window.performance) {
    const startTime = performance.now();
    return {
      name,
      startTime,
      end: () => endMetric(name, startTime)
    };
  }
  return { name, end: () => {} };
};

// End tracking and store metric
export const endMetric = (name, startTime) => {
  if (typeof window !== 'undefined' && window.performance) {
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // Store metric
    if (!performanceMetrics[name]) {
      performanceMetrics[name] = [];
    }
    performanceMetrics[name].push(duration);
    
    // Keep only last 100 measurements
    if (performanceMetrics[name].length > 100) {
      performanceMetrics[name].shift();
    }
    
    // Log slow operations
    if (duration > 1000) {
      console.warn(`[Perf] ${name} took ${Math.round(duration)}ms`);
    } else if (duration > 100) {
      console.info(`[Perf] ${name} took ${Math.round(duration)}ms`);
    }
    
    return duration;
  }
  return 0;
};

// Track API response time
export const trackApiCall = async (apiCall, endpoint) => {
  const metric = startMetric(`api_${endpoint}`);
  try {
    const result = await apiCall();
    metric.end();
    return result;
  } catch (error) {
    metric.end();
    throw error;
  }
};

// Track user interaction
export const trackInteraction = (action, details = {}) => {
  const timestamp = Date.now();
  performanceMetrics.userInteractions.push({
    action,
    timestamp,
    details,
    url: window.location.pathname
  });
  
  // Keep only last 1000 interactions
  if (performanceMetrics.userInteractions.length > 1000) {
    performanceMetrics.userInteractions.shift();
  }
};

// Get performance statistics
export const getPerformanceStats = () => {
  const stats = {};
  
  Object.keys(performanceMetrics).forEach(key => {
    if (Array.isArray(performanceMetrics[key]) && performanceMetrics[key].length > 0) {
      const values = performanceMetrics[key];
      const sum = values.reduce((a, b) => a + b, 0);
      const avg = sum / values.length;
      const max = Math.max(...values);
      const min = Math.min(...values);
      
      stats[key] = {
        count: values.length,
        average: Math.round(avg),
        max: Math.round(max),
        min: Math.round(min),
        p95: Math.round(percentile(values, 95)),
        p99: Math.round(percentile(values, 99))
      };
    }
  });
  
  return stats;
};

// Calculate percentile
const percentile = (arr, p) => {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
};

// Monitor long tasks (blocking operations)
export const monitorLongTasks = () => {
  if ('PerformanceObserver' in window) {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.duration > 50) { // Tasks longer than 50ms
          console.warn(`[Perf] Long task detected: ${entry.duration.toFixed(2)}ms`, entry);
          trackInteraction('long_task', {
            duration: entry.duration,
            startTime: entry.startTime,
            name: entry.name
          });
        }
      });
    });
    
    observer.observe({ entryTypes: ['longtask'] });
    return () => observer.disconnect();
  }
  return () => {};
};

// Monitor memory usage (if supported)
export const monitorMemory = () => {
  if ('memory' in performance) {
    const checkMemory = () => {
      const memory = performance.memory;
      const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
      const totalMB = Math.round(memory.totalJSHeapSize / 1024 / 1024);
      
      if (usedMB > totalMB * 0.8) {
        console.warn(`[Perf] High memory usage: ${usedMB}MB / ${totalMB}MB`);
      }
    };
    
    const interval = setInterval(checkMemory, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }
  return () => {};
};

// Debounce utility for performance optimization
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Throttle utility for performance optimization
export const throttle = (func, limit) => {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Optimize expensive calculations with memoization
export const memoize = (fn) => {
  const cache = new Map();
  return (...args) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
};

// Virtualized list helper for large datasets
export const virtualizeList = (items, itemHeight, containerHeight, scrollTop) => {
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(
    items.length - 1,
    Math.floor((scrollTop + containerHeight) / itemHeight)
  );
  
  const visibleItems = items.slice(startIndex, endIndex + 1);
  const offsetY = startIndex * itemHeight;
  
  return {
    visibleItems,
    offsetY,
    startIndex,
    endIndex,
    totalHeight: items.length * itemHeight
  };
};

// Image lazy loading helper
export const lazyLoadImages = () => {
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target;
          const src = img.getAttribute('data-src');
          if (src) {
            img.src = src;
            img.removeAttribute('data-src');
          }
          imageObserver.unobserve(img);
        }
      });
    });

    document.querySelectorAll('img[data-src]').forEach((img) => {
      imageObserver.observe(img);
    });

    return () => imageObserver.disconnect();
  }
  
  // Fallback for browsers without IntersectionObserver
  const loadImages = () => {
    document.querySelectorAll('img[data-src]').forEach((img) => {
      const src = img.getAttribute('data-src');
      if (src) {
        img.src = src;
        img.removeAttribute('data-src');
      }
    });
  };
  
  window.addEventListener('scroll', loadImages);
  window.addEventListener('resize', loadImages);
  loadImages(); // Load visible images on init
  
  return () => {
    window.removeEventListener('scroll', loadImages);
    window.removeEventListener('resize', loadImages);
  };
};

// Initialize performance monitoring
export const initPerformanceMonitoring = () => {
  const cleanup = [];
  
  // Monitor long tasks
  cleanup.push(monitorLongTasks());
  
  // Monitor memory (if supported)
  cleanup.push(monitorMemory());
  
  // Setup lazy loading for images
  cleanup.push(lazyLoadImages());
  
  // Track page load time
  if (document.readyState === 'complete') {
    const loadTime = performance.now();
    endMetric('page_load', 0);
  } else {
    window.addEventListener('load', () => {
      const loadTime = performance.now();
      endMetric('page_load', 0);
    });
  }
  
  // Return cleanup function
  return () => cleanup.forEach(fn => fn());
};

export default {
  startMetric,
  endMetric,
  trackApiCall,
  trackInteraction,
  getPerformanceStats,
  debounce,
  throttle,
  memoize,
  virtualizeList,
  lazyLoadImages,
  initPerformanceMonitoring
};