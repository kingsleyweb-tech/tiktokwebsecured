import { useLocation } from 'react-router-dom';

const pathTitles: Record<string, { title: string; subtitle: string }> = {
  '/':            { title: 'Dashboard',   subtitle: 'Platform overview and activity' },
  '/campaigns':   { title: 'Campaigns',   subtitle: 'Manage phishing awareness campaigns' },
  '/campaigns/create': { title: 'Create Campaign', subtitle: 'Set up a new awareness simulation' },
  '/templates':   { title: 'Templates',   subtitle: 'Simulation templates library' },
  '/events':      { title: 'Events',      subtitle: 'Audit log of simulation events' },
  '/settings':    { title: 'Settings',    subtitle: 'Platform configuration' },
  '/videos':      { title: 'Video Gates', subtitle: 'Gated video links management' },
};

interface NavbarProps {
  onMenuOpen?: () => void;
}

export default function Navbar({ onMenuOpen }: NavbarProps) {
  const { pathname } = useLocation();
  let meta = pathTitles[pathname];

  if (!meta) {
    if (pathname.startsWith('/simulation-preview/')) {
      meta = { title: 'Simulation Preview', subtitle: 'Interactive training mockup' };
    } else if (pathname.startsWith('/campaigns/')) {
      meta = { title: 'Campaign Details', subtitle: 'View campaign activity' };
    } else {
      meta = { title: 'Dashboard', subtitle: 'Phishing Awareness Platform' };
    }
  }

  return (
    <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/70 flex items-center justify-between px-4 md:px-6 shrink-0 sticky top-0 z-30">
      {/* Left: hamburger (mobile) + page title */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Hamburger — only visible on mobile */}
        <button
          id="mobile-menu-btn"
          onClick={onMenuOpen}
          className="md:hidden p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
          aria-label="Open navigation menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="min-w-0">
          <h1 className="text-base md:text-lg font-bold text-slate-800 truncate tracking-tight">{meta.title}</h1>
          <p className="text-xs text-slate-400 leading-none mt-0.5 hidden sm:block">{meta.subtitle}</p>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2 md:gap-4 shrink-0">
        {/* Search — desktop only */}
        <div className="hidden lg:flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-2 w-56 text-slate-400 focus-within:ring-2 focus-within:ring-indigo-200 transition-shadow">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search…"
            className="bg-transparent text-sm text-slate-600 placeholder:text-slate-400 outline-none w-full"
          />
        </div>

        {/* Notifications */}
        <button
          id="notifications-btn"
          className="relative p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          title="Notifications"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white"></span>
        </button>

        <div className="w-px h-6 bg-slate-200" />

        {/* Profile */}
        <div className="flex items-center gap-2.5">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-slate-700 leading-tight">Admin User</p>
            <p className="text-xs text-slate-400 leading-tight">admin@cybermonitor.gh</p>
          </div>
          <div
            id="profile-avatar"
            className="w-9 h-9 rounded-full brand-gradient flex items-center justify-center text-white text-sm font-semibold shrink-0 cursor-pointer shadow-sm shadow-indigo-200"
            title="Admin User"
          >
            A
          </div>
        </div>
      </div>
    </header>
  );
}
