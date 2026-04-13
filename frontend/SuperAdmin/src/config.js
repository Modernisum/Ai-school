/**
 * Central API configuration.
 * Sirf .env mein VITE_API_BASE_URL change karo — poore app mein reflect hoga.
 *
 * .env example:
 *   VITE_API_BASE_URL=http://localhost:8080
 */

const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export const API_BASE = BASE;                          // http://localhost:8080
export const API_ADMIN = `${BASE}/api/admin`;          // http://localhost:8080/api/admin
export const API_ROOT  = `${BASE}/api`;                // http://localhost:8080/api
