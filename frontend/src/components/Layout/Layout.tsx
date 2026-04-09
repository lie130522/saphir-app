import type { ReactNode } from 'react';
import Sidebar from './Sidebar';

interface Props { title: string; subtitle?: string; children: ReactNode; actions?: ReactNode; }

export default function Layout({ title, subtitle, children, actions }: Props) {
  const now = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <header className="topbar">
          <div className="page-title">
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <div className="topbar-right">
            <span className="topbar-date">{now}</span>
            {actions}
          </div>
        </header>
        <main className="content-area">{children}</main>
      </div>
    </div>
  );
}
