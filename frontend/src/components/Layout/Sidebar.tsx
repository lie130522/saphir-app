import { Fragment, useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import API from '../../api/client';
import { useAuth } from '../../contexts/useAuth';
import translations from '../../i18n/translations';
import { useSettings } from '../../contexts/useSettings';
import type { CompanySettings } from '../../types';

const navItems = [
  { to: '/', icon: '📊', labelKey: 'dashboard', section: 'PRINCIPAL' },
  { to: '/transactions', icon: '💸', labelKey: 'transactions', section: '' },
  { to: '/comptes', icon: '🏦', labelKey: 'accounts', section: '' },
  { to: '/rapports', icon: '📈', labelKey: 'reports', section: '' },
  { to: '/documents', icon: '🗂️', labelKey: 'documents', section: '' },
  { to: '/employes', icon: '👥', labelKey: 'employees', section: 'GESTION' },
  { to: '/projets', icon: '📁', labelKey: 'projects', section: '' },
  { to: '/utilisateurs', icon: '🔐', labelKey: 'users', section: '', adminOnly: true },
  { to: '/parametres', icon: '⚙️', labelKey: 'settings', section: '' },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, logout, isAdmin } = useAuth();
  const { language } = useSettings();
  const navigate = useNavigate();
  const t = translations[language] as Record<string, string>;

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const initials = user ? user.nom.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'U';

  const items = navItems.filter(i => !i.adminOnly || isAdmin);

  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    API.get<CompanySettings>('/settings').then((res) => {
      if (res.data.company_logo) setLogoUrl(res.data.company_logo);
    }).catch(() => {});
  }, []);

  return (
    <aside className={`sidebar ${isOpen ? 'mobile-open' : ''}`}>
      <button className="sidebar-mobile-close" onClick={onClose}>✕</button>
      
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          {logoUrl ? <img src={logoUrl} alt="Logo" className="sidebar-logo-img" /> : 'S'}
        </div>
        <div className="sidebar-logo-text">
          <h1>Saphir</h1>
          <span>Group</span>
        </div>
      </div>

      <div className="sidebar-menu">
        {items.map((item, index) => {
          const showSection = item.section && (index === 0 || items[index - 1].section !== item.section);
          return (
            <Fragment key={item.to}>
              {showSection && <div className="nav-section-title">{item.section}</div>}
              <NavLink 
                to={item.to} 
                className={({ isActive }: { isActive: boolean }) => `sidebar-link ${isActive ? 'active' : ''}`}
                onClick={() => { if (window.innerWidth <= 768) onClose(); }}
              >
                <span className="sidebar-icon">{item.icon}</span>
                {t[item.labelKey || '']}
              </NavLink>
            </Fragment>
          );
        })}
      </div>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">{initials}</div>
          <div className="user-details">
            <div className="user-name">{user?.nom}</div>
            <div className="user-role">{user?.role}</div>
          </div>
        </div>
        <button className="btn-logout" onClick={handleLogout}>🚪 {t.logout}</button>
      </div>
    </aside>
  );
}
