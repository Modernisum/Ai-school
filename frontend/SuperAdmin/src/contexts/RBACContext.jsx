import { createContext, useContext, useState, useEffect } from 'react';
import { getAdminProfile } from '../api.js';
import { PERMISSIONS, ROLES, hasPermission, canAccess, getUserPermissions } from '../rbac.js';

export const RBACContext = createContext();

const defaultUser = {
  role: null,
  permissions: [],
  profile: null,
  isLoading: true,
};

export const RBACProvider = ({ children }) => {
  const [user, setUser] = useState(defaultUser);
  
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const profileResponse = await getAdminProfile();
        
        if (profileResponse.success) {
          const profile = profileResponse.data;
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
          
          setUser({ role, permissions, profile, isLoading: false });
          localStorage.setItem('user_role', role);
        } else {
          setUser({ role: 'VIEW_ONLY', permissions: getUserPermissions('VIEW_ONLY'), profile: null, isLoading: false });
        }
      } catch (error) {
        console.error('Failed to load user profile:', error);
        setUser({ role: 'VIEW_ONLY', permissions: getUserPermissions('VIEW_ONLY'), profile: null, isLoading: false });
      }
    };
    
    loadUserProfile();
  }, []);
  
  const updateUserRole = (newRole) => {
    if (!ROLES[newRole]) {
      console.error(`Invalid role: ${newRole}`);
      return;
    }
    const permissions = getUserPermissions(newRole);
    setUser(prev => ({ ...prev, role: newRole, permissions }));
    localStorage.setItem('user_role', newRole);
  };
  
  const checkPermission = (permission) => hasPermission(user.role, permission);
  const checkAccess = (requiredPermission) => canAccess(user.role, requiredPermission);
  
  const getAvailableRoles = () => {
    return Object.keys(ROLES).map(key => ({
      key,
      name: ROLES[key].name,
      description: ROLES[key].description,
    }));
  };
  
  const value = { user, updateUserRole, checkPermission, checkAccess, getAvailableRoles, PERMISSIONS, ROLES };
  
  return (
    <RBACContext.Provider value={value}>
      {children}
    </RBACContext.Provider>
  );
};

export const useRBAC = () => {
  const context = useContext(RBACContext);
  if (!context) throw new Error('useRBAC must be used within an RBACProvider');
  return context;
};

export const withRBAC = (Component, requiredPermission = null) => {
  return function ProtectedComponent(props) {
    const { user, checkAccess } = useRBAC();
    
    if (user.isLoading) {
      return (
        <div className="flex items-center justify-center text-tertiary" style={{ height: '100vh' }}>
          <div className="spinner" style={{ marginRight: 12 }} />
          Loading permissions...
        </div>
      );
    }
    
    if (requiredPermission && !checkAccess(requiredPermission)) {
      return (
        <div className="glass-card text-center" style={{ padding: 40, margin: 20 }}>
          <h3>Access Denied</h3>
          <p className="text-tertiary mt-2">
            You don't have permission to access this page.
            Required permission: <code>{requiredPermission}</code>
          </p>
          <p className="text-xs text-tertiary mt-4">
            Your role: <strong>{user.role}</strong>
          </p>
        </div>
      );
    }
    
    return <Component {...props} />;
  };
};

export const PermissionGuard = ({ children, requiredPermission, fallback = null }) => {
  const { checkAccess } = useRBAC();
  if (requiredPermission && !checkAccess(requiredPermission)) return fallback;
  return children;
};
