import { createContext, useContext, useState, useEffect } from 'react';
import { getAdminProfile } from '../api.js';
import { PERMISSIONS, ROLES, hasPermission, canAccess, getUserPermissions } from '../rbac.js';

// Create context
export const RBACContext = createContext();

// Default user state
const defaultUser = {
  role: null,
  permissions: [],
  profile: null,
  isLoading: true,
};

/**
 * RBAC Provider Component
 * Manages user roles, permissions, and access control throughout the application
 */
export const RBACProvider = ({ children }) => {
  const [user, setUser] = useState(defaultUser);
  
  // Load user profile and determine role
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        // In a real app, this would come from the backend with the user's role
        // For now, we'll simulate by fetching profile and determining role
        const profileResponse = await getAdminProfile();
        
        if (profileResponse.success) {
          const profile = profileResponse.data;
          
          // Determine role from profile (in real app, this would come from backend)
          // For Phase 1, we'll use a simple role detection
          let role = 'VIEW_ONLY';
          
          if (profile.username === 'superadmin') {
            role = 'SUPER_ADMIN';
          } else if (profile.isAdmin) {
            role = 'ADMINISTRATOR';
          } else if (profile.department === 'support') {
            role = 'SUPPORT_MANAGER';
          } else if (profile.department === 'billing') {
            role = 'BILLING_MANAGER';
          }
          
          const permissions = getUserPermissions(role);
          
          setUser({
            role,
            permissions,
            profile,
            isLoading: false,
          });
          
          // Store role in localStorage for persistence
          localStorage.setItem('user_role', role);
        } else {
          // Default to view-only if profile fetch fails
          setUser({
            role: 'VIEW_ONLY',
            permissions: getUserPermissions('VIEW_ONLY'),
            profile: null,
            isLoading: false,
          });
        }
      } catch (error) {
        console.error('Failed to load user profile:', error);
        setUser({
          role: 'VIEW_ONLY',
          permissions: getUserPermissions('VIEW_ONLY'),
          profile: null,
          isLoading: false,
        });
      }
    };
    
    loadUserProfile();
  }, []);
  
  // Update user role (for role switching in development)
  const updateUserRole = (newRole) => {
    if (!ROLES[newRole]) {
      console.error(`Invalid role: ${newRole}`);
      return;
    }
    
    const permissions = getUserPermissions(newRole);
    
    setUser(prev => ({
      ...prev,
      role: newRole,
      permissions,
    }));
    
    localStorage.setItem('user_role', newRole);
  };
  
  // Check if user has specific permission
  const checkPermission = (permission) => {
    return hasPermission(user.role, permission);
  };
  
  // Check if user can access based on required permission(s)
  const checkAccess = (requiredPermission) => {
    return canAccess(user.role, requiredPermission);
  };
  
  // Get all available roles (for admin role management)
  const getAvailableRoles = () => {
    return Object.keys(ROLES).map(key => ({
      key,
      name: ROLES[key].name,
      description: ROLES[key].description,
    }));
  };
  
  const value = {
    user,
    updateUserRole,
    checkPermission,
    checkAccess,
    getAvailableRoles,
    PERMISSIONS,
    ROLES,
  };
  
  return (
    <RBACContext.Provider value={value}>
      {children}
    </RBACContext.Provider>
  );
};

// Custom hook for using RBAC context
export const useRBAC = () => {
  const context = useContext(RBACContext);
  
  if (!context) {
    throw new Error('useRBAC must be used within an RBACProvider');
  }
  
  return context;
};

/**
 * Higher-Order Component for protecting routes with RBAC
 */
export const withRBAC = (Component, requiredPermission = null) => {
  return function ProtectedComponent(props) {
    const { user, checkAccess } = useRBAC();
    
    // Show loading state
    if (user.isLoading) {
      return (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          color: 'var(--text3)'
        }}>
          Loading permissions...
        </div>
      );
    }
    
    // Check access
    if (requiredPermission && !checkAccess(requiredPermission)) {
      return (
        <div style={{ 
          padding: '40px', 
          textAlign: 'center',
          background: 'var(--bg-lighter)',
          borderRadius: '12px',
          margin: '20px'
        }}>
          <h3>Access Denied</h3>
          <p style={{ color: 'var(--text3)', marginTop: '10px' }}>
            You don't have permission to access this page.
            Required permission: <code>{requiredPermission}</code>
          </p>
          <p style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '20px' }}>
            Your role: <strong>{user.role}</strong>
          </p>
        </div>
      );
    }
    
    return <Component {...props} />;
  };
};

/**
 * Permission Guard Component
 * Conditionally renders children based on permission check
 */
export const PermissionGuard = ({ 
  children, 
  requiredPermission, 
  fallback = null 
}) => {
  const { checkAccess } = useRBAC();
  
  if (requiredPermission && !checkAccess(requiredPermission)) {
    return fallback;
  }
  
  return children;
};