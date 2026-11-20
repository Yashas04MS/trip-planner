import { ArrowRight, CalendarCheck2, Lock, Mail, Sparkles, User } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { WayfinderLogo } from '../components/ui/WayfinderLogo';
import { useAuth } from '../hooks/useAuth';
import { useSessionStore } from '../store/session.store';

export function AuthPage() {
  const navigate = useNavigate();
  const { signInDemo, signInEmail } = useAuth();
  const pushToast = useSessionStore((s) => s.pushToast);

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [busy, setBusy] = useState(false);

  const handleDemo = async () => {
    setBusy(true);
    try {
      await signInDemo();
      pushToast('Signed in as Aarav Mehta (Executive Demo)', 'success');
      navigate('/dashboard');
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Unable to sign in', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    try {
      await signInEmail(email.trim(), mode === 'signup' ? fullName.trim() || undefined : undefined);
      pushToast('Welcome to Wayfinder Executive Terminal', 'success');
      navigate(mode === 'signup' ? '/onboarding' : '/dashboard');
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Sign-in failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F6F0] text-[#343D2B] flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Subtle dotted flight-path decorative backdrop */}
      <svg
        aria-hidden="true"
        className="absolute inset-0 w-full h-full max-w-4xl mx-auto text-[#A7B58A]/50 pointer-events-none"
        fill="none"
        viewBox="0 0 800 600"
      >
        <path
          d="M 60 480 Q 220 200 400 310 T 740 140"
          opacity="0.45"
          stroke="currentColor"
          strokeDasharray="5 7"
          strokeWidth="1.5"
        />
        <path
          d="M 120 180 Q 300 420 520 260 T 760 460"
          opacity="0.3"
          stroke="currentColor"
          strokeDasharray="4 6"
          strokeWidth="1"
        />
        <circle cx="60" cy="480" r="3.5" className="fill-[#8B7058]" />
        <circle cx="400" cy="310" r="3" className="fill-[#68764A]" />
        <circle cx="740" cy="140" r="4" className="fill-[#8B7058]" />
      </svg>

      <div className="relative z-10 w-full max-w-[440px] bg-[#FFFDF7] border border-[#DDE1D2] rounded-2xl shadow-[0_8px_32px_rgba(52,61,43,0.08)] p-6 sm:p-8 space-y-6">
        <div className="flex flex-col items-center text-center">
          <Link to="/" className="mb-4">
            <WayfinderLogo size="lg" />
          </Link>
          <h1 className="font-display text-2xl font-semibold text-[#343D2B] tracking-tight">
            {mode === 'signin' ? 'Welcome back' : 'Create executive dossier'}
          </h1>
          <p className="text-sm text-[#68715A] mt-1">
            Sign in to your private voice travel &amp; expense concierge
          </p>
        </div>

        {/* Segmented Control */}
        <div className="p-1 bg-[#F0F0E6] border border-[#DDE1D2] rounded-xl flex items-center">
          <button
            type="button"
            onClick={() => setMode('signin')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              mode === 'signin'
                ? 'bg-[#FFFDF7] text-[#343D2B] shadow-xs'
                : 'text-[#68715A] hover:text-[#343D2B]'
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              mode === 'signup'
                ? 'bg-[#FFFDF7] text-[#343D2B] shadow-xs'
                : 'text-[#68715A] hover:text-[#343D2B]'
            }`}
          >
            Create account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div className="space-y-1.5">
              <label htmlFor="auth-name" className="block font-mono text-xs text-[#68715A]">
                Full Name
              </label>
              <div className="relative flex items-center">
                <User className="w-4 h-4 text-[#929987] absolute left-3.5 pointer-events-none" />
                <input
                  id="auth-name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Aarav Mehta"
                  className="w-full rounded-xl border border-[#DDE1D2] bg-[#F7F6F0] pl-10 pr-3.5 py-2.5 text-sm text-[#343D2B] placeholder:text-[#929987] focus:outline-none focus:border-[#68764A] focus:bg-[#FFFDF7]"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="auth-email" className="block font-mono text-xs text-[#68715A]">
              Work or Personal Email
            </label>
            <div className="relative flex items-center">
              <Mail className="w-4 h-4 text-[#929987] absolute left-3.5 pointer-events-none" />
              <input
                id="auth-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="aarav@wayfinder.travel"
                className="w-full rounded-xl border border-[#DDE1D2] bg-[#F7F6F0] pl-10 pr-3.5 py-2.5 text-sm text-[#343D2B] placeholder:text-[#929987] focus:outline-none focus:border-[#68764A] focus:bg-[#FFFDF7]"
              />
            </div>
          </div>

          <Button type="submit" disabled={busy} className="w-full">
            <span>{mode === 'signin' ? 'Continue to Terminal' : 'Create Dossier'}</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </form>

        <div className="relative flex items-center justify-center">
          <div className="w-full h-px bg-[#DDE1D2]" />
          <span className="absolute px-3 bg-[#FFFDF7] text-xs text-[#929987]">or instant access</span>
        </div>

        <Button
          variant="brown"
          disabled={busy}
          onClick={() => void handleDemo()}
          className="w-full"
        >
          <Sparkles className="w-4 h-4" />
          Continue as Executive Demo (Aarav Mehta)
        </Button>

        <div className="pt-2 border-t border-[#DDE1D2] flex items-center justify-between text-[11px] text-[#929987]">
          <span className="flex items-center gap-1">
            <Lock className="w-3 h-3 text-[#68764A]" />
            Approval-gated bookings
          </span>
          <span className="flex items-center gap-1">
            <CalendarCheck2 className="w-3 h-3 text-[#8B7058]" />
            Google Calendar sync
          </span>
        </div>
      </div>
    </div>
  );
}
