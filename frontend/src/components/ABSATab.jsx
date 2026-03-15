import { useState } from 'react';
import { Loader2, AlertCircle, Cpu, TrendingUp, TrendingDown, Minus, Layers } from 'lucide-react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const SENTIMENT_COLORS = {
  Positive:   { color: '#10b981', bg: 'rgba(16,185,129,0.12)', icon: TrendingUp   },
  Negative:   { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  icon: TrendingDown },
  Neutral:    { color: '#6b7280', bg: 'rgba(107,114,128,0.1)', icon: Minus        },
  Irrelevant: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: Minus        },
};

const EXAMPLE_REVIEWS = [
  "The screen is stunning but the battery drains so fast. Camera is excellent though.",
  "Delivery was super fast! Product quality is amazing. Price is a bit high but worth it.",
  "Software keeps crashing. Speaker quality is terrible. Design looks premium though.",
  "Great performance and camera. The battery backup is disappointing. Build feels cheap.",
];

function AspectCard({ name, data }) {
  const meta = SENTIMENT_COLORS[data.sentiment] || SENTIMENT_COLORS.Neutral;
  const Icon = meta.icon;

  return (
    <div
      className="p-4 rounded-2xl border transition-all duration-500 hover:scale-[1.02] cursor-default"
      style={{ borderColor: meta.color, background: meta.bg, boxShadow: `0 0 16px ${meta.color}20` }}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="text-sm font-bold text-white">{name}</div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border"
          style={{ color: meta.color, borderColor: meta.color, background: `${meta.color}18` }}>
          <Icon size={10} />
          {data.sentiment}
        </div>
      </div>
      <div className="text-[10px] text-textSecondary mb-2">{data.count} mention{data.count > 1 ? 's' : ''}</div>

      {/* Sentences */}
      {data.sentences && data.sentences.length > 0 && (
        <div className="space-y-1.5">
          {data.sentences.slice(0, 2).map((s, i) => {
            const sMeta = SENTIMENT_COLORS[s.sentiment] || SENTIMENT_COLORS.Neutral;
            return (
              <p key={i} className="text-[10px] italic text-textPrimary/70 leading-relaxed border-l-2 pl-2"
                style={{ borderLeftColor: sMeta.color }}>
                "{s.text}"
              </p>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ABSATab() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [charCount, setCharCount] = useState(0);

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true); setError(''); setData(null);
    try {
      const res = await axios.post(`${API_BASE}/absa`, { text });
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'ABSA analysis failed.');
    } finally {
      setLoading(false);
    }
  };

  // Group aspects by sentiment
  const byGroup = (sentiment) =>
    data ? Object.entries(data.aspects).filter(([, v]) => v.sentiment === sentiment) : [];

  const positives = byGroup('Positive');
  const negatives = byGroup('Negative');
  const neutrals  = byGroup('Neutral');

  const total = data ? Object.keys(data.aspects).length : 0;

  return (
    <div className="glass-panel p-6 md:p-8 rounded-3xl animate-slide-up neon-border">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-1 flex items-center gap-2">
          <Layers className="text-cyan-400" size={22} />
          Aspect-Based Sentiment Analysis
        </h2>
        <p className="text-textSecondary text-sm">
          Breaks a review into product aspects — Screen, Battery, Camera, Price, etc. — and analyzes sentiment for each independently.
        </p>
      </div>

      <form onSubmit={handleAnalyze} className="mb-8">
        <div className="relative mb-3">
          <textarea
            rows={5}
            value={text}
            onChange={e => { setText(e.target.value); setCharCount(e.target.value.length); }}
            maxLength={2000}
            placeholder="Paste a detailed product review here. The longer and more specific, the better the aspect breakdown..."
            className="w-full bg-surface/30 border border-white/10 focus:border-cyan-500/60 rounded-2xl p-5 text-white placeholder-textSecondary/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition-all resize-none text-sm leading-relaxed"
          />
          <div className="absolute bottom-3 right-4 text-xs text-textSecondary/50 font-mono">{charCount}/2000</div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {EXAMPLE_REVIEWS.map((ex, i) => (
            <button
              key={i}
              type="button"
              onClick={() => { setText(ex); setCharCount(ex.length); }}
              className="text-xs px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-textSecondary hover:text-white transition-all"
            >
              {ex.slice(0, 30)}…
            </button>
          ))}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading || !text.trim()}
            className="btn-shine px-7 py-3 bg-gradient-to-r from-cyan-600 to-blue-500 text-white rounded-2xl font-semibold disabled:opacity-40 flex items-center gap-2"
          >
            {loading ? <><Loader2 size={18} className="animate-spin" /> Analyzing…</> : <><Cpu size={18} /> Analyze Aspects</>}
          </button>
        </div>
      </form>

      {error && (
        <div className="p-4 bg-danger/10 border border-danger/20 rounded-xl text-danger flex items-center gap-2 mb-6 animate-fade-in text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {data && total === 0 && (
        <div className="p-6 text-center text-textSecondary rounded-xl border border-white/10 bg-surface/20">
          <Layers size={30} className="mx-auto mb-3 opacity-30" />
          <div className="font-semibold">No specific product aspects detected.</div>
          <div className="text-sm mt-1 opacity-60">Try a more detailed review mentioning screen, battery, camera, price, etc.</div>
        </div>
      )}

      {data && total > 0 && (
        <div className="animate-fade-in space-y-6 border-t border-white/10 pt-8">
          {/* Summary bar */}
          <div className="flex flex-wrap gap-3">
            {[
              { label: 'Aspects Found', val: total, color: '#ffffff' },
              { label: '✅ Positive', val: positives.length, color: '#10b981' },
              { label: '❌ Negative',  val: negatives.length, color: '#ef4444' },
              { label: '⚖️ Neutral',   val: neutrals.length,  color: '#6b7280' },
            ].map(({ label, val, color }) => (
              <div key={label} className="glass-panel px-5 py-3 rounded-2xl border border-white/5 text-center flex-1 min-w-[100px]">
                <div className="text-2xl font-extrabold mb-0.5" style={{ color }}>{val}</div>
                <div className="text-[10px] text-textSecondary uppercase tracking-wider">{label}</div>
              </div>
            ))}
          </div>

          {/* Positive aspects */}
          {positives.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-green-400 mb-3 flex items-center gap-2">
                <TrendingUp size={13} /> Positive Aspects
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {positives.map(([name, val]) => <AspectCard key={name} name={name} data={val} />)}
              </div>
            </div>
          )}

          {/* Negative aspects */}
          {negatives.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-red-400 mb-3 flex items-center gap-2">
                <TrendingDown size={13} /> Negative Aspects
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {negatives.map(([name, val]) => <AspectCard key={name} name={name} data={val} />)}
              </div>
            </div>
          )}

          {/* Neutral aspects */}
          {neutrals.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-2">
                <Minus size={13} /> Neutral Aspects
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {neutrals.map(([name, val]) => <AspectCard key={name} name={name} data={val} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
