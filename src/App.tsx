import { useEffect, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useSearchParams } from 'react-router-dom';
import { Skeleton } from './components/ui/Skeleton';
import { useAuth } from './hooks/useAuth';
import { ActivityPage } from './pages/ActivityPage';
import { AuthPage } from './pages/AuthPage';
import { CombinedTripsPage } from './pages/CombinedTripsPage';
import { ConciergePage } from './pages/ConciergePage';
import { DashboardPage } from './pages/DashboardPage';
import { DisruptionPage } from './pages/DisruptionPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { LandingPage } from './pages/LandingPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { SettingsPage } from './pages/SettingsPage';
import { TripDetailPage } from './pages/TripDetailPage';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { profile, authLoading, signInDemo } = useAuth();
  const [searchParams] = useSearchParams();
  const autostart = searchParams.get('autostart') === '1';

  useEffect(() => {
    if (!authLoading && !profile && autostart) {
      void signInDemo();
    }
  }, [authLoading, profile, autostart, signInDemo]);

  if (authLoading || (!profile && autostart)) {
    return (
      <div className="min-h-screen bg-[#F7F6F0] p-8 flex items-center justify-center">
        <div className="w-full max-w-md space-y-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

function LandingOrAutostart() {
  const [searchParams] = useSearchParams();
  if (searchParams.get('autostart') === '1') {
    return <Navigate to="/concierge?autostart=1" replace />;
  }
  return <LandingPage />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingOrAutostart />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <OnboardingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/concierge"
          element={
            <ProtectedRoute>
              <ConciergePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/combined"
          element={
            <ProtectedRoute>
              <CombinedTripsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/expenses"
          element={
            <ProtectedRoute>
              <ExpensesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/trips/:id"
          element={
            <ProtectedRoute>
              <TripDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/disruptions"
          element={
            <ProtectedRoute>
              <DisruptionPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/activity"
          element={
            <ProtectedRoute>
              <ActivityPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
