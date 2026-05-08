import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  Shield, LayoutDashboard, School, CreditCard, Ticket, Plus, FileText,
  MessageSquare, Database, Settings, Users, ShieldCheck, BarChart3,
  LogOut, ChevronLeft, ChevronRight, Bell, Activity, TrendingUp
} from 'lucide-react';
import { useRBAC, PERMISSIONS } from '../../contexts/RBACContext.jsx';
import { logout } from '../../api.js';
import HealthDot from '../ui/HealthDot.jsx';

const navSections = [
  {
    title: 'Overview',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Command Center', permission: PERMISSIONS.VIEW_DASHBOARD },
      { to: '/monitoring', icon: Activity, label: 'Live Monitoring', permission: PERMISSIONS.VIEW_MONITORING },
      { to: '/analytics', icon: TrendingUp, label: 'Analytics', permission: PERMISSIONS.VIEW_ADVANCED_STATS },
    ]
  },
  {
    title: 'Management',
    items: [
      { to: '/schools', icon: School, label: 'Schools', permission: PERMISSIONS.VIEW_SCHOOLS, badge: null },
      { to: '/billing', icon: CreditCard, label: 'Billing & Revenue', permission: PERMISSIONS.VIEW_BILLING },
      { to: '/promos', icon: Ticket, label: 'Promo Codes', permission: PERMISSIONS.VIEW_PROMOS },
      { to: '/support', icon: MessageSquare, label: 'Support', permission: PERMISSIONS.VIEW_SUPPORT },
    ]
  },
  {
    title: 'Operations',
    items: [
      { to: '/setup', icon: Plus, label: 'Add School', permission: PERMISSIONS.CREATE_SCHOOL },
      { to: '/setup-templates', icon: FileText, label: 'Setup Templates', permission: PERMISSIONS.VIEW_SETUP_TEMPLATES },
      { to: '/backup', icon: Database, label: 'Backup & Restore', permission: PERMISSIONS.VIEW_BACKUP },
    ]
  },
  {
    title: 'Security',
    items: [
      { to: '/ai-settings', icon: Settings, label: 'AI Configuration', permission: PERMISSIONS.VIEW_AI_SETTINGS },
      { to: '/user-management', icon: Users, label: 'User Management', permission: PERMISSIONS.VIEW_USERS, adminOnly: true },
      { to: '/audit-logs', icon: ShieldCheck, label: 'Audit Logs', permission: PERMISSIONS.VIEW_AUDIT_LOGS },
    ]
  },
];

export default function Sidebar({ collapsed, onToggle, health, alertCount }) {
  const { user, checkPermission } = useRBAC();
  const location = useLocation();

  const visibleSections = navSections.map(section => {
    const items = section.items.filter(item => {
      if (item.permission && !checkPermission(item.permission)) return false;
      return true;
    });
    return { ...section, items };
  }).filter(s => s.items.length > 0);

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">
          <Shield size={18} color="white" />
        </div>
        <div>
          <h2>SchoolSaaS</h2>
          <p>Control Platform</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        {visibleSections.map((section, si) => (
          <div key={si}>
            <div className="sidebar-section-title">{section.title}</div>
            {section.items.map(item => (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
                <item.icon size={16} />
                <span className="nav-label">{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar" style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))', color: 'white' }}>
            {user.profile?.username?.[0]?.toUpperCase() || 'A'}
          </div>
          <div className="user-info-text">
            <div className="name">{user.profile?.username || 'Admin'}</div>
            <div className="role">{user.role?.replace(/_/g, ' ') || 'User'}</div>
          </div>
          <button
            className="icon-btn"
            style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}
            onClick={() => { logout(); window.location.href = '/login'; }}
            title="Sign Out"
          >
            <LogOut size={14} />
          </button>
        </div>
        <button className="collapse-btn" onClick={onToggle} style={{ width: '100%', marginTop: 8 }}>
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>
    </aside>
  );
}
