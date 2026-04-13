/**
 * Security Configuration for SuperAdmin Frontend
 * Phase 1: Foundation Security Implementation
 */

export const SECURITY_CONFIG = {
    // Content Security Policy (CSP) Configuration
    CSP: {
        defaultSrc: ["'self'"],
        scriptSrc: [
            "'self'",
            "'unsafe-inline'", // Required for React development
            "'unsafe-eval'",   // Required for some libraries
            "https://fonts.googleapis.com"
        ],
        styleSrc: [
            "'self'",
            "'unsafe-inline'", // Required for inline styles
            "https://fonts.googleapis.com"
        ],
        fontSrc: [
            "'self'",
            "https://fonts.gstatic.com",
            "data:"
        ],
        imgSrc: [
            "'self'",
            "data:",
            "https:"
        ],
        connectSrc: [
            "'self'",
            "http://localhost:8080",  // Backend API
            "http://localhost:3001",  // Dev server
            "ws://localhost:3001"     // WebSocket for dev
        ],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: true
    },

    // Security Headers Configuration
    HEADERS: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
    },

    // Authentication Security
    AUTH: {
        tokenRefreshInterval: 300000, // 5 minutes
        sessionTimeout: 3600000,      // 1 hour
        maxLoginAttempts: 5,
        lockoutDuration: 900000,      // 15 minutes
        passwordPolicy: {
            minLength: 12,
            requireUppercase: true,
            requireLowercase: true,
            requireNumbers: true,
            requireSpecialChars: true
        }
    },

    // Rate Limiting Configuration (Frontend)
    RATE_LIMITING: {
        apiRequests: {
            maxRequests: 100,
            windowMs: 60000 // 1 minute
        },
        loginAttempts: {
            maxAttempts: 5,
            windowMs: 900000 // 15 minutes
        }
    },

    // Audit Logging Configuration
    AUDIT: {
        enabled: true,
        logLevels: ['ERROR', 'WARN', 'INFO', 'SECURITY'],
        sensitiveFields: ['password', 'token', 'secret', 'apiKey'],
        maxLogSize: 10000 // entries
    },

    // Input Validation Rules
    VALIDATION: {
        username: {
            minLength: 3,
            maxLength: 50,
            pattern: /^[a-zA-Z0-9_.-]+$/
        },
        email: {
            pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        },
        password: {
            minLength: 12,
            pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/
        }
    }
}

/**
 * Generate CSP header string from configuration
 */
export function generateCSPHeader() {
    const { CSP } = SECURITY_CONFIG
    const directives = []
    
    for (const [directive, values] of Object.entries(CSP)) {
        if (values && values.length > 0) {
            if (directive === 'upgradeInsecureRequests' && values === true) {
                directives.push('upgrade-insecure-requests')
            } else {
                directives.push(`${directive} ${values.join(' ')}`)
            }
        }
    }
    
    return directives.join('; ')
}

/**
 * Check if a field is considered sensitive
 */
export function isSensitiveField(fieldName) {
    return SECURITY_CONFIG.AUDIT.sensitiveFields.some(
        sensitive => fieldName.toLowerCase().includes(sensitive.toLowerCase())
    )
}

/**
 * Validate input against security rules
 */
export function validateInput(type, value) {
    const rules = SECURITY_CONFIG.VALIDATION[type]
    if (!rules) return { valid: true }
    
    if (rules.minLength && value.length < rules.minLength) {
        return { 
            valid: false, 
            error: `Minimum length is ${rules.minLength} characters` 
        }
    }
    
    if (rules.maxLength && value.length > rules.maxLength) {
        return { 
            valid: false, 
            error: `Maximum length is ${rules.maxLength} characters` 
        }
    }
    
    if (rules.pattern && !rules.pattern.test(value)) {
        return { 
            valid: false, 
            error: `Invalid format for ${type}` 
        }
    }
    
    return { valid: true }
}

/**
 * Sanitize data for logging (remove sensitive information)
 */
export function sanitizeForLogging(data) {
    if (!data || typeof data !== 'object') return data
    
    const sanitized = { ...data }
    Object.keys(sanitized).forEach(key => {
        if (isSensitiveField(key)) {
            sanitized[key] = '***REDACTED***'
        }
    })
    
    return sanitized
}

export default SECURITY_CONFIG