import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { History, RefreshCw, TrendingUp, TrendingDown, Minus, AlertCircle, BarChart2 } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Legend
} from 'recharts';

const API_BASE = 'http://localhost:8000';

const COLORS = {
  Positive: '#10b981',
  Negative: '#ef4444',
  Neutral: '#6b7280',
  Irrelevant: '#f59e0b',
};

function StatCard({ label, value, sublabel, color, icon: Icon }) {
  return (
    <div className="glass-panel p-5 rounded-2xl border border-white/5 flex items-center gap-4">
      <div className="p-3 rounded-xl" style={{ background: `${color}20` }}>
        <Icon size={20} style={{ color }} />
      </div>
      <div>
        <div className="text-2xl font-bold" style={{ color }}>{value}</div>
        <div className="text-xs text-textSecondary uppercase tracking-widest">{label}</div>
        {sublabel && <div className="text-xs text-textSecondary/60 mt-0.5">{sublabel}</div>}
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-panel px-4 py-3 rounded-xl text-xs space-y-1">
      <div className="text-textSecondary font-semibold mb-2">{label}</div>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[p.name] }} />
          <span style={{ color: COLORS[p.name] }} className="font-bold">{p.name}</span>
          <span className="text-textSecondary ml-auto">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function HistoryTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchHistory = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await axios.get(`${API_BASE}/history`);
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load history data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  // Process timeseries into chart-ready format
  const chartData = data?.timeseries
    ? Object.entries(data.timeseries)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, counts]) => ({
          date: date.slice(5), // Show MM-DD
          Positive: counts.Positive || 0,
          Negative: counts.Negative || 0,
          Neutral: counts.Neutral || 0,
          Irrelevant: counts.Irrelevant || 0,
        }))
    : [];

  const totalAnalyzed = chartData.reduce((sum, d) => sum + d.Positive + d.Negative + d.Neutral + d.Irrelevant, 0);

  const dominantSentiment = (() => {
    const totals = { Positive: 0, Negative: 0, Neutral: 0, Irrelevant: 0 };
    chartData.forEach(d => {
      Object.keys(totals).forEach(k => { totals[k] += d[k] || 0; });
    });
    return Object.entries(totals).sort(([, a], [, b]) => b - a)[0]?.[0] || 'Neutral';
  })();

  const trend = (() => {
    if (chartData.length < 2) return 'stable';
    const last = chartData[chartData.length - 1];
    const prev = chartData[chartData.length - 2];
    const lastPos = last.Positive - last.Negative;
    const prevPos = prev.Positive - prev.Negative;
    return lastPos > prevPos ? 'up' : lastPos < prevPos ? 'down' : 'stable';
  })();

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? '#10b981' : trend === 'down' ? '#ef4444' : '#6b7280';

  return (
    <div className="glass-panel p-6 md:p-8 rounded-3xl animate-slide-up neon-border space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-accent/20">
            <History size={22} className="text-accent" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Sentiment History</h2>
            <p className="text-textSecondary text-sm">Time-series view of all analyzed texts across sessions.</p>
          </div>
        </div>
        <button onClick={fetchHistory} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-textSecondary hover:text-white transition-all text-sm font-medium">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-danger/10 border border-danger/20 rounded-xl text-danger flex items-center gap-2 text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {loading && !data && (
        <div className="space-y-3">
          <div className="h-16 bg-surface/20 rounded-2xl shimmer" />
          <div className="h-64 bg-surface/20 rounded-2xl shimmer" />
        </div>
      )}

      {data && (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Total Analyzed" value={totalAnalyzed} icon={BarChart2} color="#06b6d4" />
            <StatCard label="Dominant" value={dominantSentiment} icon={TrendingUp} color={COLORS[dominantSentiment]} />
            <StatCard label="Days Tracked" value={chartData.length} icon={History} color="#6d28d9" />
            <StatCard label="Recent Trend" value={trend.charAt(0).toUpperCase() + trend.slice(1)} icon={TrendIcon} color={trendColor} />
          </div>

          {/* Chart */}
          {chartData.length > 0 ? (
            <div className="bg-surface/20 rounded-2xl border border-white/5 p-5">
              <div className="text-xs text-textSecondary uppercase tracking-widest font-semibold mb-4 flex items-center gap-2">
                <BarChart2 size={12} /> Daily Sentiment Breakdown
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                    <defs>
                      {Object.entries(COLORS).map(([key, color]) => (
                        <linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={color} stopOpacity={0.01} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="date" stroke="#6b7280" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                    <YAxis stroke="#6b7280" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} allowDecimals={false} />
                    <RechartsTooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', color: '#9ca3af' }} />
                    {Object.entries(COLORS).map(([key, color]) => (
                      <Area key={key} type="monotone" dataKey={key} stroke={color} strokeWidth={2}
                        fill={`url(#grad-${key})`} dot={false} activeDot={{ r: 4, fill: color, stroke: '#0a0a0f', strokeWidth: 2 }} />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <History size={48} className="text-textSecondary/30 mb-4" />
              <div className="text-lg font-semibold text-textSecondary">No history yet</div>
              <p className="text-sm text-textSecondary/60 max-w-xs mt-1">
                Analyze some texts using other tabs and they'll appear here as a time-series chart.
              </p>
            </div>
          )}

          {/* Per-sentiment summary bars */}
          {totalAnalyzed > 0 && (
            <div className="bg-surface/20 rounded-2xl border border-white/5 p-5">
              <div className="text-xs text-textSecondary uppercase tracking-widest font-semibold mb-4">Overall Distribution</div>
              <div className="space-y-3">
                {Object.entries(COLORS).map(([sentiment, color]) => {
                  const total = chartData.reduce((s, d) => s + (d[sentiment] || 0), 0);
                  const pct = totalAnalyzed > 0 ? Math.round((total / totalAnalyzed) * 100) : 0;
                  return (
                    <div key={sentiment}>
                      <div className="flex justify-between text-xs font-semibold mb-1.5">
                        <span style={{ color }}>{sentiment}</span>
                        <span className="text-textSecondary">{total} ({pct}%)</span>
                      </div>
                      <div className="h-2 bg-surface rounded-full overflow-hidden">
                        <div className="h-2 rounded-full transition-all duration-1000"
                          style={{ width: `${pct}%`, backgroundColor: color, boxShadow: `0 0 8px ${color}80` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
