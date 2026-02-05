import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

const navItems: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: '📊' },
  { path: '/agents', label: 'Agents', icon: '🤖' },
  { path: '/graph', label: 'Social Graph', icon: '🕸️' },
  { path: '/capabilities', label: 'Capabilities', icon: '🔑' },
  { path: '/attestations', label: 'Attestations', icon: '📜' }
];

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside
        style={{
          width: 240,
          background: '#0d0d14',
          borderRight: '1px solid #2a2a3a',
          padding: 20
        }}
      >
        <div style={{ marginBottom: 32 }}>
          <h1
            style={{
              fontSize: 20,
              fontWeight: 700,
              background: 'linear-gradient(135deg, #4ecdc4, #45b7d1)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            🤖 Agent Identity Hub
          </h1>
          <p style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
            Decentralized Identity Manager
          </p>
        </div>

        <nav>
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px 16px',
                borderRadius: 8,
                textDecoration: 'none',
                color: location.pathname === item.path ? '#fff' : '#888',
                background: location.pathname === item.path ? '#2a2a3a' : 'transparent',
                marginBottom: 4,
                transition: 'all 0.2s'
              }}
            >
              <span style={{ marginRight: 12, fontSize: 18 }}>{item.icon}</span>
              <span style={{ fontSize: 14 }}>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div
          style={{
            marginTop: 'auto',
            padding: 16,
            background: '#1a1a2e',
            borderRadius: 8,
            marginTop: 32
          }}
        >
          <div style={{ fontSize: 11, color: '#888', marginBottom: 8 }}>
            System Status
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#2ecc71',
                marginRight: 8
              }}
            />
            <span style={{ fontSize: 12 }}>Connected</span>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, padding: 24, overflow: 'auto' }}>
        {children}
      </main>
    </div>
  );
};

export default Layout;
