import { useState } from 'react';
import {
  ShoppingCart, Loader2, AlertCircle, Search, Star,
  TrendingUp, TrendingDown, Hash, Activity
} from 'lucide-react';
import axios from 'axios';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

const API_BASE = "http://localhost:8000";

const COLORS = {
  Positive: '#10b981', Negative: '#ef4444', Neutral: '#6b7280', Irrelevant: '#f59e0b',
};
const GLOW = {
  Positive: 'rgba(16,185,129,0.5)', Negative: 'rgba(239,68,68,0.5)',
  Neutral: 'rgba(107,114,128,0.4)', Irrelevant: 'rgba(245,158,11,0.5)',
};

function CustomTooltip({ active, payload }) {
  if (active && payload?.length) {
    const { name, value } = payload[0];
    return (
      <div className="glass-panel px-4 py-2 rounded-xl text-sm">
        <span style={{ color: COLORS[name] }} className="font-bold">{name}</span>
        <span className="text-textSecondary ml-2">{value}</span>
      </div>
    );
  }
  return null;
}

function StarRating({ stars }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          size={14}
          fill={i <= Math.round(stars) ? '#f59e0b' : 'transparent'}
          stroke={i <= Math.round(stars) ? '#f59e0b' : '#4b5563'}
        />
      ))}
    </div>
  );
}

function WordCloud({ keywords }) {
  if (!keywords || keywords.length === 0) return null;
  const maxCount = keywords[0]?.count || 1;
  return (
    <div className="bg-surface/20 rounded-2xl border border-white/5 p-5">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-textSecondary mb-3 flex items-center gap-2">
        <Hash size={11} /> Review Keywords
      </div>
      <div className="flex flex-wrap gap-2">
        {keywords.slice(0, 25).map(({ word, count }) => {
          const pct = count / maxCount;
          const fontSize = 10 + pct * 12; // 10–22px
          const opacity = 0.5 + pct * 0.5;
          return (
            <span
              key={word}
              className="inline-block cursor-default transition-all hover:text-accent"
              style={{ fontSize, opacity, color: `hsl(${260 + pct * 60}, 70%, 75%)` }}
            >
              {word}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export default function AmazonTab() {
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(20);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [productName, setProductName] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true); setError(''); setData(null); setProductName(query.trim());
    try {
      const res = await axios.get(`${API_BASE}/scrape/amazon`, { params: { query, limit } });
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'No Amazon reviews found. Try a different product name.');
    } finally {
      setLoading(false);
    }
  };

  const totalReviews = data?.total_reviews || 0;
  const positiveCount = data?.counts?.Positive || 0;
  const negativeCount = data?.counts?.Negative || 0;
  const positivePct = totalReviews > 0 ? Math.round((positiveCount / totalReviews) * 100) : 0;

  // Verdict
  const verdict = positivePct >= 65
    ? { label: '✅ Highly Recommended', color: '#10b981' }
    : positivePct >= 40
    ? { label: '👍 Generally Positive', color: '#6d28d9' }
    : positivePct >= 25
    ? { label: '⚖️ Mixed Reviews', color: '#f59e0b' }
    : { label: '❌ Not Recommended', color: '#ef4444' };

  const chartData = data
    ? Object.entries(data.counts).filter(([, v]) => v > 0).map(([k, v]) => ({ name: k, value: v }))
    : [];

  return (
    <div className="glass-panel p-6 md:p-8 rounded-3xl animate-slide-up" style={{ borderTop: '2px solid #f97316' }}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-orange-400 mb-1 flex items-center gap-2">
          <ShoppingCart size={22} /> Amazon Review Intelligence
        </h2>
        <p className="text-textSecondary text-sm">
          Search any product to scrape live Amazon reviews and get a full sentiment + keyword analysis.
        </p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-textSecondary/50" size={16} />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="e.g., Sony WH-1000XM5 headphones"
            className="w-full bg-surface/30 border border-white/10 focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 rounded-xl py-3 pl-10 pr-4 text-white outline-none transition-all text-sm"
          />
        </div>
        <select
          value={limit}
          onChange={e => setLimit(Number(e.target.value))}
          className="bg-surface/30 border border-white/10 rounded-xl px-4 py-3 text-white cursor-pointer outline-none"
        >
          {[10, 20, 30].map(v => <option key={v} value={v}>{v} Reviews</option>)}
        </select>
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="btn-shine px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-bold disabled:opacity-40 flex items-center gap-2"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : 'Scrape'}
        </button>
      </form>

      {loading && (
        <div className="space-y-3 animate-fade-in">
          <div className="h-32 bg-surface/20 rounded-2xl shimmer" />
          <div className="h-16 bg-surface/20 rounded-2xl shimmer" />
          <div className="h-16 bg-surface/20 rounded-2xl shimmer" />
        </div>
      )}

      {error && (
        <div className="p-4 bg-danger/10 border border-danger/20 rounded-xl text-danger flex gap-2 items-center text-sm animate-fade-in">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {data && (
        <div className="animate-fade-in space-y-6">

          {/* ── Product Card ─── */}
          {data.product && (
            <div className="flex gap-4 p-5 bg-surface/30 border border-orange-500/20 rounded-2xl">
              {data.product.image && (
                <img
                  src={data.product.image}
                  alt={data.product.title}
                  className="w-24 h-24 object-contain rounded-xl bg-white/5 p-2 flex-shrink-0"
                />
              )}
              <div className="flex-1">
                <div className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-1">Amazon Product</div>
                <h3 className="text-sm font-bold text-white leading-snug mb-2 line-clamp-2">{data.product.title}</h3>
                <div className="flex flex-wrap items-center gap-3">
                  {data.avg_stars && <StarRating stars={data.avg_stars} />}
                  {data.avg_stars && (
                    <span className="text-xs font-bold text-amber-400">{data.avg_stars} / 5</span>
                  )}
                  {data.product.link && (
                    <a
                      href={data.product.link}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-orange-400 hover:text-orange-300 underline transition-colors"
                    >
                      View on Amazon ↗
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Verdict Card ─── */}
          <div
            className="p-6 rounded-2xl border flex flex-col sm:flex-row items-center gap-6"
            style={{ borderColor: verdict.color, background: `${verdict.color}10`, boxShadow: `0 0 30px ${verdict.color}20` }}
          >
            <div className="flex-1 text-center sm:text-left">
              <div className="text-xs text-textSecondary uppercase tracking-widest mb-1">AI Verdict</div>
              <div className="text-3xl font-extrabold mb-2" style={{ color: verdict.color }}>{verdict.label}</div>
              <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
                {[
                  { label: 'Reviews', val: totalReviews, color: '#fff' },
                  { label: 'Positive', val: `${positivePct}%`, color: COLORS.Positive },
                  { label: 'Negative', val: `${Math.round((negativeCount / totalReviews) * 100)}%`, color: COLORS.Negative },
                ].map(({ label, val, color }) => (
                  <div key={label} className="bg-surface/60 border border-white/10 rounded-xl px-4 py-2 text-center">
                    <div className="text-base font-bold" style={{ color }}>{val}</div>
                    <div className="text-[10px] text-textSecondary">{label}</div>
                  </div>
                ))}
              </div>
            </div>
            {/* Donut */}
            <div className="w-[140px] h-[140px] flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartData} cx="50%" cy="50%" innerRadius={38} outerRadius={60} paddingAngle={3} dataKey="value" strokeWidth={0}>
                    {chartData.map((e, i) => <Cell key={i} fill={COLORS[e.name]} />)}
                  </Pie>
                  <RechartsTooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── Word Cloud + Bar Chart ─── */}
          <div className="grid md:grid-cols-2 gap-4">
            <WordCloud keywords={data.keywords} />

            <div className="h-[200px] bg-surface/20 rounded-2xl border border-white/5 p-3">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-textSecondary mb-2">Sentiment Breakdown</div>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                  <XAxis dataKey="name" stroke="#6b7280" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                  <YAxis stroke="#6b7280" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                  <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {chartData.map((e, i) => <Cell key={i} fill={COLORS[e.name]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── Review Feed ─── */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-widest text-textSecondary mb-3 flex items-center gap-2">
              <Activity size={13} /> Review Feed
            </h3>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {data.reviews.map((r, i) => {
                const sentColor = COLORS[r.Predicted_Sentiment] || '#6b7280';
                return (
                  <div
                    key={i}
                    className="p-4 bg-surface/30 hover:bg-surface/50 border-l-4 border border-white/5 rounded-xl transition-all text-sm animate-fade-in"
                    style={{ borderLeftColor: sentColor, animationDelay: `${i * 0.03}s` }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        {r.Title && <p className="text-white font-semibold text-xs mb-0.5">{r.Title}</p>}
                        <StarRating stars={r.Stars || 3} />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-widest flex-shrink-0" style={{ color: sentColor }}>
                        {r.Predicted_Sentiment}
                      </span>
                    </div>
                    <p className="text-textPrimary/80 italic mt-1 leading-relaxed text-xs line-clamp-3">"{r.Text}"</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
