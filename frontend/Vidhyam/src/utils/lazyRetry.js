import { lazy } from 'react';

/**
 * Enhanced React.lazy with retry logic for handling dynamic import failures.
 * Useful for recovering from network drops or Vite dev server restarts.
 * 
 * @param {Function} componentImport - Function that returns a dynamic import promise.
 * @param {number} retriesLeft - Number of retry attempts.
 */
export const lazyRetry = (componentImport, retries = 2) => {
  return lazy(async () => {
    for (let i = 0; i <= retries; i++) {
      try {
        return await componentImport();
      } catch (error) {
        if (i === retries) throw error;
        // Wait, then retry.
        // On the final retry, we can't easily change the import URL without string manipulation
        // But the browser usually recovers if wait time is sufficient.
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }
  });
};

export default lazyRetry;
