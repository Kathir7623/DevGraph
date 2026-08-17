import React from 'react';
import { LayoutDashboard, Users, Compass, ShieldCheck, ShieldAlert } from 'lucide-react';

export default function Navbar({ activePage, setActivePage, dbConnected }) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'developers', label: 'Developers', icon: Users },
    { id: 'explore', label: 'Network Explorer', icon: Compass }
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        Dev<span>Graph</span>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={`nav-link ${activePage === item.id ? 'active' : ''}`}
              onClick={() => setActivePage(item.id)}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className={`db-status ${dbConnected ? 'connected' : 'disconnected'}`}>
          <div className="dot"></div>
          <span>{dbConnected ? 'CognoDB Connected' : 'DB Disconnected'}</span>
        </div>
      </div>
    </div>
  );
}
