import { useState } from 'react';
import axios from 'axios';
import { GitCompare, Loader2, AlertCircle, Zap, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, Cell
} from 'recharts';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const COLORS = {
  Positive: '#10b981',
  Negative: '#ef4444',
  Neutral: '#6b7280',
  Irrelevant: '#f59e0b',
};

const EXAMPLES = [
  ['This product exceeded all my expectations! Best purchase of the year 🎉', 'Terrible quality, broke after two days. Complete waste of money 😤'],
  ['The movie was breathtaking — stunning visuals and brilliant acting.', 'I fell asleep halfway through, totally boring and predictable.'],
  ['Customer service resolved my issue quickly and professionally.', 'Waited 3 hours on hold, no one helped. Absolutely awful experience.'],
];

function WinnerBadge({ winner }) {
  const map = { A: { color: '#6d28d9', label: 'Text A Wins' }, B: { color: '#2563eb', label: 'Text B Wins' }, tie: { color: '#f59e0b', label: '🤝 Tie' } };
  const cfg = map[winner] || map.tie;
  return (
    <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold border"
      style={{ color: cfg.color, borderColor: cfg.color, background: `${cfg.color}18` }}>
      {cfg.label}
    </div>
  );
}

function SentimentCard({ label, confidence, color }) {
  const arrow = label === 'Positive'
    ? <TrendingUp size={18} style={{ color }} />
    : label === 'Negative'
    ? <TrendingDown size={18} style={{ color }} />
    : <Minus size={18} style={{ color }} />;
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-white/5">
      {arrow}
      <div>
        <div className="text-xs text-textSecondary uppercase tracking-widest">Consensus</div>
        <div className="font-bold text-lg" style={{ color }}>{label}</div>
      </div>
      {confidence != null && (
        <span className="ml-auto text-xs font-bold px-2 py-1 rounded-full bg-white/10" style={{ color }}>
          {(confidence * 100).toFixed(1)}%
        </span>
      )}
    </div>
  );
}

function ResultPanel({ data, label, accent }) {
  if (!data) return null;
  const consensus = data.consensus;
  const color = COLORS[consensus] || '#6b7280';
  const models = Object.entries(data.results).filter(([k]) => k !== 'RoBERTa_Confidence');

  return (
    <div className="flex-1 glass-panel rounded-2xl p-5 border-t-2 space-y-4 animate-fade-in"
      style={{ borderTopColor: accent }}>
      <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: accent }}>{label}</div>
      <SentimentCard label={consensus} confidence={data.results['RoBERTa_Confidence']} color={color} />
      <div className="grid grid-cols-2 gap-2">
        {models.map(([model, sent]) => (
          <div key={model} className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface/50 border border-white/5 text-xs">
            <span className="text-textSecondary truncate mr-2">{model}</span>
            <span className="font-bold" style={{ color: COLORS[sent] || '#9ca3af' }}>{sent}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CompareTab() {
  const [textA, setTextA] = useState('');
  const [textB, setTextB] = useState('');
  const [loading, setLoading] = useState(false);
  const [dataA, setDataA] = useState(null);
  const [dataB, setDataB] = useState(null);
  const [error, setError] = useState('');

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!textA.trim() || !textB.trim()) return;
    setLoading(true); setError(''); setDataA(null); setDataB(null);
    try {
      const [resA, resB] = await Promise.all([
        axios.post(`${API_BASE}/analyze`, { text: textA }),
        axios.post(`${API_BASE}/analyze`, { text: textB }),
      ]);
      setDataA(resA.data);
      setDataB(resB.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Analysis failed. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  const loadExample = (pair) => {
    setTextA(pair[0]); setTextB(pair[1]);
    setDataA(null); setDataB(null);
  };

  // Compute winner
  let winner = null;
  if (dataA && dataB) {
    const scoreMap = { Positive: 3, Neutral: 1, Irrelevant: 0, Negative: -1 };
    const sA = scoreMap[dataA.consensus] ?? 0;
    const sB = scoreMap[dataB.consensus] ?? 0;
    winner = sA > sB ? 'A' : sB > sA ? 'B' : 'tie';
  }

  // Radar data for model comparison
  const radarData = dataA && dataB
    ? Object.entries(dataA.sentiment_counts).map(([sentiment, countA]) => ({
        sentiment,
        A: countA,
        B: dataB.sentiment_counts[sentiment] || 0,
      }))
    : [];

  // Bar chart data
  const barData = dataA && dataB
    ? ['Positive', 'Negative', 'Neutral', 'Irrelevant'].map(s => ({
        name: s,
        A: dataA.sentiment_counts[s] || 0,
        B: dataB.sentiment_counts[s] || 0,
      }))
    : [];

  return (
    <div className="glass-panel p-6 md:p-8 rounded-3xl animate-slide-up neon-border space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-xl bg-primary/20">
          <GitCompare size={22} className="text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Head-to-Head Compare</h2>
          <p className="text-textSecondary text-sm">Analyze two texts side-by-side and see which sentiment wins.</p>
        </div>
      </div>

      {/* Example pairs */}
      <div className="flex flex-wrap gap-2">
        {EXAMPLES.map((pair, i) => (
          <button key={i} type="button" onClick={() => loadExample(pair)}
            className="text-xs px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-textSecondary hover:text-white transition-all">
            Example {i + 1}
          </button>
        ))}
      </div>

      {/* Input form */}
      <form onSubmit={handleAnalyze} className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          {/* Text A */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-primary">Text A</label>
            <textarea rows={4} value={textA} onChange={e => setTextA(e.target.value)} maxLength={800}
              placeholder="Enter first text to analyze..."
              className="w-full bg-surface/30 border border-primary/20 focus:border-primary/60 rounded-xl p-4 text-white placeholder-textSecondary/40 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none text-sm transition-all" />
          </div>
          {/* Text B */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-secondary">Text B</label>
            <textarea rows={4} value={textB} onChange={e => setTextB(e.target.value)} maxLength={800}
              placeholder="Enter second text to analyze..."
              className="w-full bg-surface/30 border border-secondary/20 focus:border-secondary/60 rounded-xl p-4 text-white placeholder-textSecondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/20 resize-none text-sm transition-all" />
          </div>
        </div>

        <div className="flex justify-center">
          <button type="submit" disabled={loading || !textA.trim() || !textB.trim()}
            className="btn-shine px-10 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-2xl font-bold disabled:opacity-40 flex items-center gap-2 shadow-lg shadow-primary/20 transition-all hover:opacity-90">
            {loading
              ? <><Loader2 size={18} className="animate-spin" /> Analyzing both…</>
              : <><Zap size={18} /> Compare Both</>}
          </button>
        </div>
      </form>

      {error && (
        <div className="p-4 bg-danger/10 border border-danger/20 rounded-xl text-danger flex items-center gap-2 text-sm animate-fade-in">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Results */}
      {dataA && dataB && (
        <div className="animate-fade-in space-y-6 border-t border-white/10 pt-6">
          {/* Winner */}
          <div className="flex flex-col items-center gap-2">
            <div className="text-xs text-textSecondary uppercase tracking-widest font-semibold">Result</div>
            <WinnerBadge winner={winner} />
          </div>

          {/* Side-by-side panels */}
          <div className="flex flex-col md:flex-row gap-4">
            <ResultPanel data={dataA} label="Text A" accent="#6d28d9" />
            <div className="hidden md:flex items-center justify-center">
              <div className="text-2xl font-black text-textSecondary">VS</div>
            </div>
            <ResultPanel data={dataB} label="Text B" accent="#2563eb" />
          </div>

          {/* Charts */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Bar chart - model vote distribution */}
            <div className="bg-surface/20 rounded-2xl border border-white/5 p-4">
              <div className="text-xs text-textSecondary uppercase tracking-widest font-semibold mb-3">Model Vote Distribution</div>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                    <XAxis dataKey="name" stroke="#6b7280" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                    <YAxis stroke="#6b7280" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} allowDecimals={false} />
                    <RechartsTooltip
                      formatter={(val, name) => [val, name === 'A' ? 'Text A' : 'Text B']}
                      contentStyle={{ background: '#12121c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}
                    />
                    <Bar dataKey="A" name="A" fill="#6d28d9" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="B" name="B" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Radar chart */}
            <div className="bg-surface/20 rounded-2xl border border-white/5 p-4">
              <div className="text-xs text-textSecondary uppercase tracking-widest font-semibold mb-3">Sentiment Radar</div>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} cx="50%" cy="50%" outerRadius={60}>
                    <PolarGrid stroke="rgba(255,255,255,0.08)" />
                    <PolarAngleAxis dataKey="sentiment" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 5]} tick={false} axisLine={false} />
                    <Radar name="Text A" dataKey="A" stroke="#6d28d9" fill="#6d28d9" fillOpacity={0.3} />
                    <Radar name="Text B" dataKey="B" stroke="#2563eb" fill="#2563eb" fillOpacity={0.3} />
                    <RechartsTooltip
                      formatter={(val, name) => [val, name === 'A' ? 'Text A' : 'Text B']}
                      contentStyle={{ background: '#12121c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Legend */}
              <div className="flex justify-center gap-5 mt-1">
                {[{ color: '#6d28d9', label: 'Text A' }, { color: '#2563eb', label: 'Text B' }].map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-1.5 text-xs text-textSecondary">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />{label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
