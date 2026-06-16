import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Package, ShoppingCart, Users, BookOpen,
  Warehouse, Tag, BarChart3, Shield, Settings, LogOut, Sun, Moon, Zap, FolderOpen
} from 'lucide-react';

const menuItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/products', label: 'Products', icon: Package },
  { path: '/categories', label: 'Categories', icon: FolderOpen },
  { path: '/orders', label: 'Orders', icon: ShoppingCart },
  { path: '/users', label: 'Users', icon: Users },
  { path: '/ledger', label: 'Ledger & Credit', icon: BookOpen },
  { path: '/inventory', label: 'Inventory', icon: Warehouse },
  { path: '/schemes', label: 'Discounts', icon: Tag },
  { path: '/reports', label: 'Reports', icon: BarChart3 },
  { path: '/admin-users', label: 'Admin Security', icon: Shield, superAdminOnly: true },
  { path: '/settings', label: 'Settings', icon: Settings },
];

const Sidebar = ({ darkMode, toggleDarkMode }) => {
  const { logout, isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <nav className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-logo"><Zap size={20} /></div>
        <span className="brand-name">Supply Setu</span>
      </div>

      <ul className="sidebar-menu">
        {menuItems.map((item) => {
          if (item.superAdminOnly && !isSuperAdmin) return null;
          const Icon = item.icon;
          return (
            <li key={item.path}>
              <NavLink to={item.path} className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
                <Icon size={18} />
                {item.label}
              </NavLink>
            </li>
          );
        })}
      </ul>

      <div className="sidebar-footer">
        <button className="theme-toggle-btn" onClick={toggleDarkMode}>
          {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          {darkMode ? 'Light Mode' : 'Dark Mode'}
        </button>
        <button className="theme-toggle-btn" onClick={handleLogout} style={{ color: 'var(--danger)' }}>
          <LogOut size={16} /> Logout
        </button>
      </div>
    </nav>
  );
};

export default Sidebar;
