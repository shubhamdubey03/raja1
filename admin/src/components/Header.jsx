import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Search, Bell } from 'lucide-react';

const Header = ({ search, setSearch }) => {
  const { user } = useAuth();
  const initials = user?.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2) || 'AD';

  return (
    <header className="top-header">
      <div className="search-box">
        <Search size={16} color="var(--text-muted)" />
        <input
          placeholder="Search anything..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="header-actions">
        <div style={{ position: 'relative', cursor: 'pointer' }}>
          <Bell size={20} color="var(--text-secondary)" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="admin-avatar">{initials}</div>
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: 700 }}>{user?.full_name || 'Admin'}</div>
            <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>{user?.role || 'admin'}</div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
