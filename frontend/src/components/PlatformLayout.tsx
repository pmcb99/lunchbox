import type { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  Calendar,
  CheckCircle2,
  Database,
  Key,
  LogOut,
  Table as TableIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getAuthEmail, clearAuth } from '@/lib/auth';

interface PlatformLayoutProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

const navItems = [
  { label: 'Overview', href: '/platform', icon: Activity },
  { label: 'Databases', href: '/platform/databases', icon: Database },
  { label: 'DB Viewer', href: '/platform/db-viewer', icon: TableIcon },
  { label: 'Revisions', href: '/platform/revisions', icon: CheckCircle2 },
  { label: 'Schedules', href: '/platform/schedules', icon: Calendar },
  { label: 'API Keys', href: '/platform/keys', icon: Key },
];

export function PlatformLayout({ eyebrow, title, subtitle, actions, children }: PlatformLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    clearAuth();
    navigate('/platform/login');
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="flex">
        <aside className="hidden lg:flex lg:flex-col w-72 border-r border-[#1f1f1f] bg-[#0c0c0c] min-h-screen">
          <div className="px-6 py-6 border-b border-[#1f1f1f]">
            <Link to="/platform" className="flex items-center gap-2">
              <img src="/lunchbox.png" alt="Lunchbox" className="w-8 h-8 object-cover" />
              <span className="text-lg font-display font-semibold">
                lunchbox<span className="text-[#ff6b35]">.</span>
              </span>
            </Link>
            <div className="mt-4 text-xs text-[#777]">Workspace</div>
            <div className="text-sm text-white">Shovelstone Labs</div>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-2 text-sm">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.label}
                  to={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-200 ${
                    isActive
                      ? 'bg-[#ff6b35]/10 text-[#ff6b35]'
                      : 'text-[#a0a0a0] hover:text-white hover:bg-white/5'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="px-6 py-6 border-t border-[#1f1f1f]">
            <div className="text-xs text-[#777]">Signed in as</div>
            <div className="text-sm text-white mb-4">{getAuthEmail()}</div>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="w-full border-[#2a2a2a] text-white hover:bg-white/5"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </Button>
          </div>
        </aside>

        <main className="flex-1">
          <header className="border-b border-[#1f1f1f] bg-[#0b0b0b]">
            <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-[#777]">{eyebrow}</div>
                <h1 className="text-3xl font-display font-semibold">{title}</h1>
                {subtitle && <p className="text-sm text-[#777] mt-2">{subtitle}</p>}
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={handleLogout}
                  className="border-[#2a2a2a] text-white hover:bg-white/5"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign out
                </Button>
                {actions}
              </div>
            </div>
          </header>

          <div className="max-w-6xl mx-auto px-6 py-10 space-y-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
