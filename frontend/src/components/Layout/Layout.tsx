import { useState, type ReactNode } from 'react';
import Sidebar from './Sidebar';
import GlobalSearch from '../Search/GlobalSearch';

interface Props { title: string; subtitle?: string; children: ReactNode; actions?: ReactNode; }

export default function Layout({ title, subtitle, children, actions }: Props) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const now = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="app-container">
      <div className={`sidebar-overlay ${isMobileMenuOpen ? 'visible' : ''}`} onClick={() => setIsMobileMenuOpen(false)} />
      
      <Sidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
      
      <div className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <button className="btn-menu" onClick={() => setIsMobileMenuOpen(true)}>☰</button>
            <div className="page-title">
              <h2>{title}</h2>
              {subtitle && <p className="no-mobile">{subtitle}</p>}
            </div>
          </div>
          
          <div className="topbar-right">
            <GlobalSearch />
            <span className="topbar-date">{now}</span>
            <div className="actions-wrapper">
              {actions}
            </div>
          </div>
        </header>
        
        <main className="content-area">{children}</main>
      </div>
    </div>
  );
}
