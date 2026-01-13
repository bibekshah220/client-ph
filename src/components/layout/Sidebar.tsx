import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Pill,
  Package,
  ShoppingCart,
  Users,
  FileText,
  Settings,
  LogOut,
  Truck,
  ClipboardList,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon, label }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      cn(
        'sidebar-nav-item',
        isActive && 'active'
      )
    }
  >
    {icon}
    <span>{label}</span>
  </NavLink>
);

export const Sidebar: React.FC = () => {
  const { profile, userRole, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const navItems = [
    { to: '/dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { to: '/medicines', icon: <Pill size={20} />, label: 'Medicines' },
    { to: '/inventory', icon: <Package size={20} />, label: 'Inventory' },
    { to: '/billing', icon: <ShoppingCart size={20} />, label: 'Billing' },
    { to: '/sales', icon: <FileText size={20} />, label: 'Sales History' },
  ];

  const adminNavItems = [
    { to: '/suppliers', icon: <Truck size={20} />, label: 'Suppliers' },
    { to: '/reports', icon: <ClipboardList size={20} />, label: 'Reports' },
    { to: '/users', icon: <Users size={20} />, label: 'Users' },
  ];

  return (
    <aside className="w-64 min-h-screen gradient-sidebar flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <Pill size={24} className="text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-sidebar-foreground">PharmaNP</h1>
            <p className="text-xs text-sidebar-foreground/60">Nepal DDA Compliant</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}

        {(userRole === 'admin' || userRole === 'pharmacist') && (
          <>
            <div className="pt-4 pb-2">
              <p className="px-4 text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider">
                Management
              </p>
            </div>
            {adminNavItems.map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
          </>
        )}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-4 py-3 mb-2">
          <div className="w-9 h-9 rounded-full bg-sidebar-accent flex items-center justify-center">
            <span className="text-sm font-medium text-sidebar-foreground">
              {profile?.name?.charAt(0) || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {profile?.name || 'User'}
            </p>
            <p className="text-xs text-sidebar-foreground/60 capitalize">
              {userRole || 'Staff'}
            </p>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          className="sidebar-nav-item w-full text-sidebar-foreground/70 hover:text-destructive"
        >
          <LogOut size={20} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
