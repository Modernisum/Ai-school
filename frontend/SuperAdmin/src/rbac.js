/**
 * Role-Based Access Control (RBAC) Configuration for SuperAdmin
 * 
 * This file defines roles, permissions, and access control logic for the SuperAdmin dashboard.
 * Based on Phase 1 requirements for implementing RBAC framework.
 */

// Permission constants
export const PERMISSIONS = {
  // Dashboard
  VIEW_DASHBOARD: 'view:dashboard',
  VIEW_ADVANCED_STATS: 'view:advanced_stats',
  
  // Schools Management
  VIEW_SCHOOLS: 'view:schools',
  CREATE_SCHOOL: 'create:school',
  EDIT_SCHOOL: 'edit:school',
  DELETE_SCHOOL: 'delete:school',
  BLOCK_SCHOOL: 'block:school',
  EXPORT_SCHOOLS: 'export:schools',
  IMPORT_SCHOOLS: 'import:schools',
  
  // Billing & Revenue
  VIEW_BILLING: 'view:billing',
  MANAGE_BILLING: 'manage:billing',
  VIEW_REVENUE_REPORTS: 'view:revenue_reports',
  
  // Promo Codes
  VIEW_PROMOS: 'view:promos',
  CREATE_PROMOS: 'create:promos',
  MANAGE_PROMOS: 'manage:promos',
  
  // Support
  VIEW_SUPPORT: 'view:support',
  RESOLVE_SUPPORT: 'resolve:support',
  
  // Backup & Restore
  VIEW_BACKUP: 'view:backup',
  CREATE_BACKUP: 'create:backup',
  RESTORE_BACKUP: 'restore:backup',
  
  // System Configuration
  VIEW_SETUP_TEMPLATES: 'view:setup_templates',
  MANAGE_SETUP_TEMPLATES: 'manage:setup_templates',
  VIEW_AI_SETTINGS: 'view:ai_settings',
  MANAGE_AI_SETTINGS: 'manage:ai_settings',
  
  // User Management
  VIEW_USERS: 'view:users',
  CREATE_USERS: 'create:users',
  EDIT_USERS: 'edit:users',
  DELETE_USERS: 'delete:users',
  
  // Audit & Monitoring
  VIEW_AUDIT_LOGS: 'view:audit_logs',
  VIEW_MONITORING: 'view:monitoring',
  
  // System Administration
  MANAGE_SYSTEM_CONFIG: 'manage:system_config',
  VIEW_SYSTEM_HEALTH: 'view:system_health',
};

// Role definitions with associated permissions
export const ROLES = {
  SUPER_ADMIN: {
    name: 'Super Administrator',
    description: 'Full system access with all permissions',
    permissions: Object.values(PERMISSIONS),
  },
  
  ADMINISTRATOR: {
    name: 'Administrator',
    description: 'Full operational access except system-level configuration',
    permissions: [
      PERMISSIONS.VIEW_DASHBOARD,
      PERMISSIONS.VIEW_ADVANCED_STATS,
      PERMISSIONS.VIEW_SCHOOLS,
      PERMISSIONS.CREATE_SCHOOL,
      PERMISSIONS.EDIT_SCHOOL,
      PERMISSIONS.DELETE_SCHOOL,
      PERMISSIONS.BLOCK_SCHOOL,
      PERMISSIONS.EXPORT_SCHOOLS,
      PERMISSIONS.IMPORT_SCHOOLS,
      PERMISSIONS.VIEW_BILLING,
      PERMISSIONS.MANAGE_BILLING,
      PERMISSIONS.VIEW_REVENUE_REPORTS,
      PERMISSIONS.VIEW_PROMOS,
      PERMISSIONS.CREATE_PROMOS,
      PERMISSIONS.MANAGE_PROMOS,
      PERMISSIONS.VIEW_SUPPORT,
      PERMISSIONS.RESOLVE_SUPPORT,
      PERMISSIONS.VIEW_BACKUP,
      PERMISSIONS.CREATE_BACKUP,
      PERMISSIONS.RESTORE_BACKUP,
      PERMISSIONS.VIEW_SETUP_TEMPLATES,
      PERMISSIONS.MANAGE_SETUP_TEMPLATES,
      PERMISSIONS.VIEW_AI_SETTINGS,
      PERMISSIONS.MANAGE_AI_SETTINGS,
      PERMISSIONS.VIEW_AUDIT_LOGS,
      PERMISSIONS.VIEW_MONITORING,
    ],
  },
  
  SUPPORT_MANAGER: {
    name: 'Support Manager',
    description: 'Access to support, schools view, and basic operations',
    permissions: [
      PERMISSIONS.VIEW_DASHBOARD,
      PERMISSIONS.VIEW_SCHOOLS,
      PERMISSIONS.EDIT_SCHOOL,
      PERMISSIONS.VIEW_SUPPORT,
      PERMISSIONS.RESOLVE_SUPPORT,
      PERMISSIONS.VIEW_BILLING,
    ],
  },
  
  BILLING_MANAGER: {
    name: 'Billing Manager',
    description: 'Access to billing, revenue reports, and school financials',
    permissions: [
      PERMISSIONS.VIEW_DASHBOARD,
      PERMISSIONS.VIEW_SCHOOLS,
      PERMISSIONS.VIEW_BILLING,
      PERMISSIONS.MANAGE_BILLING,
      PERMISSIONS.VIEW_REVENUE_REPORTS,
      PERMISSIONS.VIEW_PROMOS,
      PERMISSIONS.MANAGE_PROMOS,
    ],
  },
  
  VIEW_ONLY: {
    name: 'View Only',
    description: 'Read-only access to dashboard and schools',
    permissions: [
      PERMISSIONS.VIEW_DASHBOARD,
      PERMISSIONS.VIEW_SCHOOLS,
      PERMISSIONS.VIEW_BILLING,
      PERMISSIONS.VIEW_SUPPORT,
      PERMISSIONS.VIEW_AUDIT_LOGS,
    ],
  },
};

// Default role for new users
export const DEFAULT_ROLE = 'VIEW_ONLY';

// Helper functions
export const hasPermission = (userRole, permission) => {
  if (!userRole || !ROLES[userRole]) {
    return false;
  }
  
  return ROLES[userRole].permissions.includes(permission);
};

export const getUserPermissions = (userRole) => {
  if (!userRole || !ROLES[userRole]) {
    return [];
  }
  
  return ROLES[userRole].permissions;
};

export const getRoleName = (roleKey) => {
  return ROLES[roleKey]?.name || roleKey;
};

export const getAllRoles = () => {
  return Object.keys(ROLES).map(key => ({
    key,
    name: ROLES[key].name,
    description: ROLES[key].description,
    permissionCount: ROLES[key].permissions.length,
  }));
};

/**
 * Check if user can access a route based on required permissions
 * @param {string} userRole - User's role key
 * @param {string|Array} requiredPermission - Single permission or array of permissions
 * @returns {boolean} - Whether access is allowed
 */
export const canAccess = (userRole, requiredPermission) => {
  if (!requiredPermission) {
    return true; // No permission required
  }
  
  if (Array.isArray(requiredPermission)) {
    // Check if user has ANY of the required permissions
    return requiredPermission.some(perm => hasPermission(userRole, perm));
  }
  
  return hasPermission(userRole, requiredPermission);
};

/**
 * Create a permission guard for React components
 * @param {string} userRole - User's role
 * @param {string|Array} requiredPermission - Required permission(s)
 * @param {ReactNode} children - Component to render if permission granted
 * @param {ReactNode} fallback - Component to render if permission denied (optional)
 * @returns {ReactNode} - Either children or fallback
 */
export const withPermission = (userRole, requiredPermission, children, fallback = null) => {
  return canAccess(userRole, requiredPermission) ? children : fallback;
};