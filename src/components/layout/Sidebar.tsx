import {
  Activity,
  AlertTriangle,
  Layers,
  LayoutDashboard,
  LogOut,
  Mic,
  Receipt,
  Settings,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useSessionStore } from '../../store/session.store';
import { WayfinderMark } from '../ui/WayfinderLogo';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Home & Trips', icon: LayoutDashboard },
  { to: '/concierge', label: 'Voice Concierge', icon: Mic },
  { to: '/combined', label: 'Combined Plans', icon: Layers },
  { to: '/expenses', label: 'Expense Tracker', icon: Receipt },
  { to: '/disruptions', label: 'Disruptions', icon: AlertTriangle },
  { to: '/activity', label: 'Activity Audit', icon: Activity },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const { profile, signOut } = useAuth();
  const openDisruptions = useSessionStore(
    (s) => s.disruptions.filter((d) => d.status === 'open').length,
  );
  const initials = (profile?.full_name || 'Aarav Mehta')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside
      aria-label="Primary navigation"
      className="hidden lg:flex flex-col items-center justify-between w-[72px] shrink-0 border-r border-[#DDE1D2] bg-[#FFFDF7] py-4 shadow-[0_1px_8px_rgba(52,61,43,0.04)] z-30"
    >
      <div className="flex flex-col items-center gap-6 w-full">
        <NavLink
          to="/"
          aria-label="Wayfinder Overview"
          title="Wayfinder Overview"
          className="w-11 h-11 rounded-xl flex items-center justify-center hover:bg-[#F0F0E6] transition-colors"
        >
          <WayfinderMark className="w-8 h-8" />
        </NavLink>

        <nav className="flex flex-col items-center gap-1.5 w-full px-2">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              aria-label={label}
              title={label}
              className={({ isActive }) =>
                `relative w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                  isActive
                    ? 'bg-[#68764A] text-white shadow-sm'
                    : 'text-[#68715A] hover:text-[#343D2B] hover:bg-[#F0F0E6]'
                }`
              }
            >
              <Icon className="w-[19px] h-[19px]" />
              {to === '/disruptions' && openDisruptions > 0 && (
                <span
                  aria-label={`${openDisruptions} open disruptions`}
                  className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#A87832]"
                />
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="flex flex-col items-center gap-3">
        <NavLink
          to="/settings"
          title={profile?.full_name || 'Account'}
          className="w-9 h-9 rounded-full bg-[#EDE5DA] border border-[#8B7058]/30 flex items-center justify-center text-xs font-semibold text-[#8B7058] hover:ring-2 hover:ring-[#68764A]/35 transition-all"
        >
          {initials}
        </NavLink>
        <button
          type="button"
          onClick={() => void signOut()}
          aria-label="Sign out"
          title="Sign out"
          className="w-10 h-10 rounded-xl flex items-center justify-center text-[#929987] hover:text-[#A94F45] hover:bg-[#F0F0E6] transition-colors cursor-pointer"
        >
          <LogOut className="w-[18px] h-[18px]" />
        </button>
      </div>
    </aside>
  );
}
