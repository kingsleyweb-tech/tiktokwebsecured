import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { subscribeToAuthChanges } from './services/authService';
import type { AdminUser } from './types/user';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import VerifyResetCode from './pages/VerifyResetCode';
import ResetPassword from './pages/ResetPassword';
import Campaigns from './pages/Campaigns';
import CreateCampaign from './pages/CreateCampaign';
import CampaignDetails from './pages/CampaignDetails';
import Templates from './pages/Templates';
import SimulationPreview from './pages/SimulationPreview';
import Simulation from './pages/Simulation';
import Events from './pages/Events';
import Settings from './pages/Settings';
import VideoManagement from './pages/VideoManagement';
import VideoGate from './pages/VideoGate';

// ─── Auth Guard ───────────────────────────────────────────────────────────────
function RequireAuth({ user, children }: { user: AdminUser | null | undefined; children: React.ReactNode }) {
  if (user === undefined) {
    // Still checking auth state — show spinner
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (user === null) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  // undefined = loading, null = not authenticated, AdminUser = authenticated
  const [user, setUser] = useState<AdminUser | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((u) => setUser(u));
    return unsubscribe;
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* ── Public routes ── */}
        <Route path="/simulate/:campaignId/:templateId" element={<Simulation />} />
        <Route path="/simulate/:campaignId" element={<Simulation />} />
        <Route path="/simulate/*" element={<Simulation />} />
        <Route path="/watch/:videoId" element={<VideoGate />} />

        {/* ── Auth routes (redirect to / if already logged in) ── */}
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/forgot-password" element={user ? <Navigate to="/" replace /> : <ForgotPassword />} />
        <Route path="/verify-reset-code" element={user ? <Navigate to="/" replace /> : <VerifyResetCode />} />
        <Route path="/reset-password" element={user ? <Navigate to="/" replace /> : <ResetPassword />} />

        {/* ── Protected admin dashboard ── */}
        <Route element={
          <RequireAuth user={user}>
            <DashboardLayout />
          </RequireAuth>
        }>
          <Route index path="/"                                    element={<Dashboard />} />
          <Route path="/campaigns"                                 element={<Campaigns />} />
          <Route path="/campaigns/create"                          element={<CreateCampaign />} />
          <Route path="/campaigns/:campaignId"                     element={<CampaignDetails />} />
          <Route path="/templates"                                 element={<Templates />} />
          <Route path="/simulation-preview/:templateId"            element={<SimulationPreview />} />
          <Route path="/events"                                    element={<Events />} />
          <Route path="/videos"                                    element={<VideoManagement />} />
          <Route path="/settings"                                  element={<Settings />} />
        </Route>

        {/* ── 404 fallback ── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}