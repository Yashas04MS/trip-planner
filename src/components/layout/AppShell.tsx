import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useSessionStore } from '../../store/session.store';
import { WayfinderMark } from '../ui/WayfinderLogo';
import { BottomNav } from './BottomNav';
import { Sidebar } from './Sidebar';
import { ToastRegion } from '../ui/Toast';

export function AppShell({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const connected = useSessionStore((s) => s.connected);
  const session = useSessionStore((s) => s.session);

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden bg-[#F7F6F0] text-[#343D2B] flex">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col lg:overflow-hidden">
        {/* Executive Terminal Top Bar matching reference design */}
        <header className="h-14 shrink-0 bg-[#FFFDF7]/90 backdrop-blur-xl border-b border-[#DDE1D2] px-4 sm:px-6 flex items-center justify-between gap-3 z-20">
          <div className="flex items-center gap-2.5 min-w-0">
            <NavLink to="/" className="lg:hidden shrink-0" aria-label="Wayfinder Home">
              <WayfinderMark className="w-7 h-7" />
            </NavLink>
            <div className="flex items-center gap-2 font-mono text-xs truncate">
              <span className="font-medium text-[#68715A] uppercase tracking-wider hidden sm:inline">
                Executive Terminal
              </span>
              <span className="text-[#929987] hidden sm:inline">/</span>
              <span className="text-[#8B7058] font-medium truncate">
                Live Voice Protocol
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <nav className="hidden md:flex items-center gap-1 mr-1">
              <NavLink
                to="/combined"
                className={({ isActive }) =>
                  `px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-[#E3E9D8] text-[#343D2B]'
                      : 'text-[#68715A] hover:text-[#343D2B] hover:bg-[#F0F0E6]'
                  }`
                }
              >
                Combined Plans
              </NavLink>
              <NavLink
                to="/expenses"
                className={({ isActive }) =>
                  `px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-[#EDE5DA] text-[#8B7058]'
                      : 'text-[#68715A] hover:text-[#343D2B] hover:bg-[#F0F0E6]'
                  }`
                }
              >
                Expense Tracker
              </NavLink>
            </nav>

            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F0F0E6] border border-[#DDE1D2] font-mono text-[11px] text-[#68715A]">
              <span
                className={`w-2 h-2 rounded-full ${
                  connected ? 'bg-[#547A55]' : 'bg-[#8B7058]'
                }`}
              />
              <span>
                {session
                  ? `Session ${session.channel.slice(-6).toUpperCase()}`
                  : 'Concierge Ready'}
              </span>
            </div>

            {profile && (
              <span className="hidden xl:inline-flex items-center px-2.5 py-1 rounded-full bg-[#EDE5DA] text-[#8B7058] text-xs font-medium">
                {profile.home_airport} · {profile.full_name.split(' ')[0]}
              </span>
            )}
          </div>
        </header>

        <main className="flex-1 min-w-0 pb-20 lg:pb-0 flex flex-col lg:overflow-y-auto bg-[#F7F6F0]">
          {children}
        </main>
      </div>
      <BottomNav />
      <ToastRegion />
    </div>
  );
}
