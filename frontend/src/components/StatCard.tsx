interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
  accentColor?: string;
}

export default function StatCard({
  title,
  value,
  change,
  changeType = 'neutral',
  icon,
  accentColor = 'bg-indigo-50 text-indigo-600',
}: StatCardProps) {
  const changeStyles =
    changeType === 'up'
      ? 'text-emerald-600 bg-emerald-50'
      : changeType === 'down'
      ? 'text-rose-600 bg-rose-50'
      : 'text-slate-500 bg-slate-100';

  const changeIcon = changeType === 'up' ? '↑' : changeType === 'down' ? '↓' : '•';

  return (
    <div className="card p-5 flex items-start gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      {/* Icon */}
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${accentColor}`}>
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{title}</p>
        <p className="text-2xl font-bold text-slate-800 mt-1 tracking-tight">{value}</p>
        {change && (
          <span className={`inline-flex items-center gap-1 text-[11px] mt-2 font-semibold px-2 py-0.5 rounded-full ${changeStyles}`}>
            <span>{changeIcon}</span>
            {change}
          </span>
        )}
      </div>
    </div>
  );
}
