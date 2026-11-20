import { Layers, LayoutDashboard, Mic, Receipt, Settings } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const MOBILE_ITEMS = [
  { to: '/dashboard', label: 'Trips', icon: LayoutDashboard },
  { to: '/combined', label: 'Circuits', icon: Layers },
  { to: '/concierge', label: 'Voice', icon: Mic, primary: true },
  { to: '/expenses', label: 'Expenses', icon: Receipt },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function BottomNav() {
  return (
    <nav
      aria-label="Mobile navigation"
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 h-16 border-t border-[#DDE1D2] bg-[#FFFDF7]/95 backdrop-blur-md px-2 flex items-center justify-around shadow-[0_-2px_12px_rgba(52,61,43,0.05)]"
    >
      {MOBILE_ITEMS.map(({ to, label, icon: Icon, primary }) => (
        <NavLink
          key={to}
          to={to}
          aria-label={label}
          className={({ isActive }) =>
            primary
              ? `flex items-center justify-center w-12 h-12 -mt-4 rounded-full border shadow-md transition-all ${
                  isActive
                    ? 'bg-[#68764A] text-white border-[#566339]'
                    : 'bg-[#EDE5DA] text-[#8B7058] border-[#8B7058]/40'
                }`
              : `flex flex-col items-center justify-center gap-0.5 min-w-[48px] min-h-[44px] text-[11px] font-medium transition-colors ${
                  isActive ? 'text-[#68764A]' : 'text-[#68715A]'
                }`
          }
        >
          <Icon className={primary ? 'w-5 h-5' : 'w-4 h-4'} />
          {!primary && <span>{label}</span>}
        </NavLink>
      ))}
    </nav>
  );
}
