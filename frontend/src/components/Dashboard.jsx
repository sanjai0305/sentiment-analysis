import { useState, useEffect, useRef } from 'react';
import {
  MessageSquare, TrendingUp, Youtube, Loader2, Sparkles,
  AlertCircle, ChevronRight, Zap, BarChart2, Activity, Search, Radio, Brain, Layers, ShoppingCart,
  Globe, Frown, Hash, Mic, GitCompare, History, Flame, ChevronDown, Menu, X
} from 'lucide-react';
import axios from 'axios';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, RadialBarChart, RadialBar, Legend
} from 'recharts';
import LiveStreamTab from './LiveStreamTab';
import EmotionTab from './EmotionTab';
import ABSATab from './ABSATab';
import AmazonTab from './AmazonTab';
import MultilingualTab from './MultilingualTab';
import SarcasmTab from './SarcasmTab';
import TopicTab from './TopicTab';
import VoiceTab from './VoiceTab';
import CompareTab from './CompareTab';
import HistoryTab from './HistoryTab';
import TrendingTab from './TrendingTab';

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const COLORS = {
  Positive: '#10b981',
  Negative: '#ef4444',
  Neutral: '#6b7280',
  Irrelevant: '#f59e0b',
};

const GLOW = {
  Positive: 'rgba(16,185,129,0.5)',
  Negative: 'rgba(239,68,68,0.5)',
  Neutral: 'rgba(107,114,128,0.5)',
  Irrelevant: 'rgba(245,158,11,0.5)',
};

// Animated count-up number
function CountUp({ target, duration = 1000 }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setVal(target); clearInterval(timer); }
      else setVal(Math.round(start));
    }, 16);
    return () => clearInterval(timer);
  }, [target]);
  return <span>{val}</span>;
}

// Sentiment badge with glow and pulse ring
function SentimentBadge({ label, confidence, isMain }) {
  const color = COLORS[label] || '#6b7280';
  const glow = GLOW[label];
  return (
    <div
      className={`relative p-4 rounded-2xl border transition-all duration-500 ${isMain ? 'border-opacity-80' : 'border-white/10'} bg-surface/40 hover:scale-105 cursor-default`}
      style={isMain ? { borderColor: color, boxShadow: `0 0 24px ${glow}, inset 0 0 16px ${glow}22` } : {}}
    >
      <div className="text-xs text-textSecondary uppercase tracking-widest mb-2 font-semibold">{label === 'Irrelevant' ? 'Off-topic' : label}</div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-radar absolute inline-flex h-full w-full rounded-full" style={{ backgroundColor: color, opacity: 0.6 }} />
            <span className="relative inline-flex rounded-full h-3 w-3" style={{ backgroundColor: color }} />
          </span>
          <span className="text-lg font-bold" style={{ color }}>{label}</span>
        </div>
        {confidence != null && (
          <span className="text-xs font-bold bg-white/10 px-2 py-1 rounded-full" style={{ color }}>
            {(confidence * 100).toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}

// Stacked horizontal bar chart for vote distribution
function VoteBar({ counts }) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) return null;
  return (
    <div className="mt-6">
      <div className="text-xs text-textSecondary uppercase tracking-widest mb-3 font-semibold">Vote Distribution</div>
      <div className="flex rounded-full overflow-hidden h-4 w-full gap-0.5">
        {Object.entries(counts).filter(([, v]) => v > 0).map(([k, v]) => (
          <div
            key={k}
            className="h-full transition-all duration-700 first:rounded-l-full last:rounded-r-full"
            style={{ width: `${(v / total) * 100}%`, backgroundColor: COLORS[k], boxShadow: `0 0 8px ${GLOW[k]}` }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-3 mt-3">
        {Object.entries(counts).filter(([, v]) => v > 0).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1.5 text-xs text-textSecondary">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[k] }} />
            <span className="font-medium" style={{ color: COLORS[k] }}>{k}</span>
            <span className="text-textSecondary/60">({Math.round((v / total) * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Custom tooltip for Recharts
function CustomTooltip({ active, payload }) {
  if (active && payload?.length) {
    const { name, value } = payload[0];
    return (
      <div className="glass-panel px-4 py-2 rounded-xl text-sm">
        <span style={{ color: COLORS[name] }} className="font-bold">{name}</span>
        <span className="text-textSecondary ml-2">{value} votes</span>
      </div>
    );
  }
  return null;
}

const NAV_GROUPS = [
  {
    group: 'Analysis',
    color: '#6d28d9',
    items: [
      { id: 'single',  label: 'Single Review',  icon: MessageSquare },
      { id: 'compare', label: 'Compare Texts',  icon: GitCompare    },
    ],
  },
  {
    group: 'Social',
    color: '#ff4500',
    items: [
      { id: 'reddit',  label: 'Reddit Live',    icon: TrendingUp   },
      { id: 'youtube', label: 'YouTube',        icon: Youtube      },
      { id: 'amazon',  label: 'Amazon',         icon: ShoppingCart },
      { id: 'live',    label: 'Live Stream',    icon: Radio        },
    ],
  },
  {
    group: 'AI Features',
    color: '#06b6d4',
    items: [
      { id: 'emotion',      label: 'Emotion',        icon: Brain    },
      { id: 'absa',         label: 'Aspects (ABSA)', icon: Layers   },
      { id: 'multilingual', label: 'Multilingual',   icon: Globe    },
      { id: 'sarcasm',      label: 'Sarcasm',        icon: Frown    },
      { id: 'voice',        label: 'Voice',          icon: Mic      },
    ],
  },
  {
    group: 'Insights',
    color: '#f59e0b',
    items: [
      { id: 'topics',   label: 'Topic Model', icon: Hash    },
      { id: 'history',  label: 'History',     icon: History },
      { id: 'trending', label: 'Trending',    icon: Flame   },
    ],
  },
];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('single');
  const [openGroups, setOpenGroups] = useState({ Analysis: true, Social: true, 'AI Features': true, Insights: true });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleGroup = (group) => setOpenGroups(g => ({ ...g, [group]: !g[group] }));

  const activeLabel = NAV_GROUPS.flatMap(g => g.items).find(i => i.id === activeTab)?.label || '';
  const activeGroupColor = NAV_GROUPS.find(g => g.items.some(i => i.id === activeTab))?.color || '#6d28d9';

  const handleNavClick = (id) => {
    setActiveTab(id);
    setSidebarOpen(false);
  };

  return (
    <div className="w-full max-w-7xl mx-auto animate-fade-in">
      {/* Mobile toggle */}
      <div className="flex md:hidden items-center gap-3 mb-4 px-1">
        <button onClick={() => setSidebarOpen(s => !s)}
          className="glass-panel p-2.5 rounded-xl border border-white/10 text-textSecondary hover:text-white transition-all">
          {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
        <div className="flex items-center gap-2 text-sm">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: activeGroupColor }} />
          <span className="text-textSecondary">Current:</span>
          <span className="font-semibold text-white">{activeLabel}</span>
        </div>
      </div>

      <div className="flex gap-6">
        {/* ── Sidebar ── */}
        <aside className={`
          fixed inset-0 z-40 md:static md:z-auto md:block
          transition-all duration-300
          ${sidebarOpen ? 'block' : 'hidden md:block'}
        `}>
          {/* Mobile overlay */}
          {sidebarOpen && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm md:hidden"
              onClick={() => setSidebarOpen(false)} />
          )}

          <div className="relative z-10 w-56 md:w-52 flex-shrink-0 glass-panel rounded-2xl border border-white/8 p-3 space-y-1 sidebar-panel
            absolute left-4 top-0 md:static h-fit">
            {/* Sidebar header */}
            <div className="px-2 pb-2 mb-1 border-b border-white/8">
              <div className="text-[10px] font-bold uppercase tracking-widest text-textSecondary/60">Navigation</div>
            </div>

            {NAV_GROUPS.map(({ group, color, items }) => (
              <div key={group}>
                {/* Group header */}
                <button onClick={() => toggleGroup(group)}
                  className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/4 transition-all group">
                  <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color }}>{group}</span>
                  <ChevronDown size={11} className={`text-textSecondary/50 transition-transform duration-200 ${openGroups[group] ? 'rotate-0' : '-rotate-90'}`} />
                </button>

                {/* Group items */}
                {openGroups[group] && (
                  <div className="space-y-0.5 mb-1">
                    {items.map(({ id, label, icon: Icon }) => {
                      const active = activeTab === id;
                      return (
                        <button key={id} onClick={() => handleNavClick(id)}
                          className={`sidebar-item w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium transition-all duration-200 text-left
                            ${active
                              ? 'text-white bg-white/10 shadow-inner'
                              : 'text-textSecondary hover:text-white hover:bg-white/5'
                            }`}
                          style={active ? { borderLeft: `3px solid ${color}`, paddingLeft: '7px' } : {}}>
                          <Icon size={14} style={active ? { color } : {}} />
                          {label}
                          {active && <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </aside>

        {/* ── Main content ── */}
        <main className="flex-1 min-w-0">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-4 px-1">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: activeGroupColor }} />
            <span className="text-xs text-textSecondary/70">
              {NAV_GROUPS.find(g => g.items.some(i => i.id === activeTab))?.group}
            </span>
            <ChevronRight size={11} className="text-textSecondary/40" />
            <span className="text-xs font-semibold text-white">{activeLabel}</span>
          </div>

          {activeTab === 'single'       && <SingleReviewTab />}
          {activeTab === 'compare'      && <CompareTab />}
          {activeTab === 'reddit'       && <RedditLiveTab />}
          {activeTab === 'youtube'      && <YouTubeTab />}
          {activeTab === 'live'         && <LiveStreamTab />}
          {activeTab === 'emotion'      && <EmotionTab />}
          {activeTab === 'absa'         && <ABSATab />}
          {activeTab === 'amazon'       && <AmazonTab />}
          {activeTab === 'multilingual' && <MultilingualTab />}
          {activeTab === 'sarcasm'      && <SarcasmTab />}
          {activeTab === 'topics'       && <TopicTab />}
          {activeTab === 'voice'        && <VoiceTab />}
          {activeTab === 'history'      && <HistoryTab />}
          {activeTab === 'trending'     && <TrendingTab />}
        </main>
      </div>
    </div>
  );
}

// ─── TAB 1: Single Review ──────────────────────────────────────────────────
function SingleReviewTab() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [charCount, setCharCount] = useState(0);

  const handleChange = (e) => {
    setText(e.target.value);
    setCharCount(e.target.value.length);
  };

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true); setError(''); setData(null);
    try {
      const res = await axios.post(`${API_BASE}/analyze`, { text });
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to analyze text. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel p-6 md:p-8 rounded-3xl animate-slide-up neon-border">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-1 flex items-center gap-2">
          <Sparkles className="text-accent" size={22} />
          Text Analysis Engine
        </h2>
        <p className="text-textSecondary text-sm">Ensemble of Logistic Regression, SVM, Random Forest &amp; RoBERTa.</p>
      </div>

      <form onSubmit={handleAnalyze} className="mb-8">
        <div className="relative">
          <textarea
            rows={5}
            value={text}
            onChange={handleChange}
            maxLength={1000}
            placeholder="Paste your product review, tweet, or social media post here..."
            className="w-full bg-surface/30 border border-white/10 focus:border-primary/60 rounded-2xl p-5 text-white placeholder-textSecondary/40 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all duration-300 resize-none text-sm leading-relaxed"
          />
          <div className="absolute bottom-3 right-4 text-xs text-textSecondary/50 font-mono">
            {charCount}/1000
          </div>
        </div>
        <div className="flex justify-between items-center mt-3">
          <div className="flex gap-2 flex-wrap">
            {['This product is amazing! 🔥', 'Worst purchase ever 😤', 'Pretty average honestly'].map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => { setText(ex); setCharCount(ex.length); }}
                className="text-xs px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-textSecondary hover:text-white transition-all"
              >
                {ex.substring(0, 20)}…
              </button>
            ))}
          </div>
          <button
            type="submit"
            disabled={loading || !text.trim()}
            className="btn-shine px-7 py-3 bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white rounded-2xl font-semibold transition-all shadow-lg shadow-primary/20 disabled:opacity-40 flex items-center gap-2"
          >
            {loading ? <><Loader2 size={18} className="animate-spin" /> Analyzing…</> : <><Zap size={18} /> Analyze</>}
          </button>
        </div>
      </form>

      {error && (
        <div className="p-4 bg-danger/10 border border-danger/20 rounded-xl text-danger flex items-center gap-2 mb-6 animate-fade-in text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {data && (
        <div className="animate-fade-in border-t border-white/10 pt-8 space-y-8">
          {/* Model Cards */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-widest text-textSecondary mb-4 flex items-center gap-2">
              <Activity size={14} /> Model Predictions
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(data.results)
                .filter(([k]) => k !== 'RoBERTa_Confidence')
                .map(([model, label]) => (
                  <SentimentBadge
                    key={model}
                    label={label}
                    confidence={model === 'RoBERTa' ? data.results['RoBERTa_Confidence'] : null}
                    isMain={model === 'RoBERTa'}
                  />
                ))}
            </div>
          </div>

          {/* Consensus + Chart */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              {/* Big consensus card */}
              <div
                className="p-6 rounded-2xl border transition-all duration-500"
                style={{
                  borderColor: COLORS[data.consensus],
                  background: `linear-gradient(135deg, ${COLORS[data.consensus]}15, transparent)`,
                  boxShadow: `0 0 32px ${GLOW[data.consensus]}`
                }}
              >
                <div className="text-xs text-textSecondary uppercase tracking-widest mb-2 font-semibold">Ensemble Consensus</div>
                <div className="text-5xl font-extrabold" style={{ color: COLORS[data.consensus] }}>
                  {data.consensus}
                </div>
                <div className="text-sm text-textSecondary mt-1">Voted by {Object.values(data.sentiment_counts).reduce((a, b) => a + b, 0)} models</div>
              </div>

              <VoteBar counts={data.sentiment_counts} />
            </div>

            {/* Donut chart */}
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={Object.entries(data.sentiment_counts)
                      .filter(([, v]) => v > 0)
                      .map(([k, v]) => ({ name: k, value: v }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={72}
                    outerRadius={106}
                    paddingAngle={4}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {Object.entries(data.sentiment_counts)
                      .filter(([, v]) => v > 0)
                      .map(([k], i) => <Cell key={i} fill={COLORS[k]} />)}
                  </Pie>
                  <RechartsTooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── TAB 2: Reddit Live ───────────────────────────────────────────────────
function RedditLiveTab() {
  const [subreddit, setSubreddit] = useState('');
  const [limit, setLimit] = useState(50);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const handleScrape = async (e) => {
    e.preventDefault();
    if (!subreddit.trim()) return;
    setLoading(true); setError(''); setData(null);
    try {
      const res = await axios.get(`${API_BASE}/reddit`, { params: { subreddit, limit } });
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch Reddit data.');
    } finally {
      setLoading(false);
    }
  };

  const popularSubs = ['technology', 'worldnews', 'gaming', 'movies', 'stocks'];

  return (
    <div className="glass-panel p-6 md:p-8 rounded-3xl animate-slide-up" style={{ borderTop: '2px solid #ff4500' }}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#ff4500] mb-1 flex items-center gap-2">
          <TrendingUp size={22} /> Live Reddit Ingestion
        </h2>
        <p className="text-textSecondary text-sm">Scrape "hot" posts from any subreddit and instantly evaluate community mood.</p>
      </div>

      <form onSubmit={handleScrape} className="mb-6">
        <div className="flex gap-3 mb-3">
          <div className="relative flex-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-textSecondary font-bold">r/</span>
            <input
              type="text"
              value={subreddit}
              onChange={(e) => setSubreddit(e.target.value.replace(/\s+/g, ''))}
              placeholder="subreddit name"
              className="w-full bg-surface/30 border border-white/10 focus:border-[#ff4500]/50 focus:ring-2 focus:ring-[#ff4500]/20 rounded-xl py-3 pl-10 pr-4 text-white outline-none transition-all font-medium text-sm"
            />
          </div>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="bg-surface/30 border border-white/10 rounded-xl px-4 py-3 text-white cursor-pointer outline-none"
          >
            {[10, 25, 50, 100].map(v => <option key={v} value={v}>{v} Posts</option>)}
          </select>
          <button
            type="submit"
            disabled={loading || !subreddit.trim()}
            className="btn-shine px-6 py-3 bg-gradient-to-r from-[#ff4500] to-[#ff6a00] text-white rounded-xl font-bold disabled:opacity-40 flex items-center gap-2 transition-all"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : 'Scrape'}
          </button>
        </div>
        {/* Quick picks */}
        <div className="flex flex-wrap gap-2">
          {popularSubs.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setSubreddit(s)}
              className={`text-xs px-3 py-1.5 border rounded-full transition-all ${subreddit === s ? 'border-[#ff4500] text-[#ff4500] bg-[#ff4500]/10' : 'border-white/10 text-textSecondary hover:text-white hover:border-white/30'}`}
            >
              r/{s}
            </button>
          ))}
        </div>
      </form>

      {error && <div className="p-4 bg-danger/10 border border-danger/20 rounded-xl text-danger flex gap-2 items-center text-sm mb-4 animate-fade-in"><AlertCircle size={15}/>{error}</div>}

      {data && (
        <div className="animate-fade-in space-y-6">
          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Posts Scraped', val: data.posts.length, color: '#ff4500' },
              { label: 'Positive', val: data.counts.Positive || 0, color: COLORS.Positive },
              { label: 'Negative', val: data.counts.Negative || 0, color: COLORS.Negative },
            ].map(({ label, val, color }) => (
              <div key={label} className="glass-panel p-4 rounded-2xl border border-white/5 text-center">
                <div className="text-3xl font-bold mb-1" style={{ color }}>
                  <CountUp target={val} />
                </div>
                <div className="text-xs text-textSecondary uppercase tracking-wider">{label}</div>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="h-[240px] bg-surface/20 rounded-2xl border border-white/5 p-3">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={Object.entries(data.counts).map(([k, v]) => ({ name: k, value: v }))}
                    cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value" strokeWidth={0}>
                    {Object.entries(data.counts).map(([k], i) => <Cell key={i} fill={COLORS[k]} />)}
                  </Pie>
                  <RechartsTooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="h-[240px] bg-surface/20 rounded-2xl border border-white/5 p-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={Object.entries(data.counts).map(([k, v]) => ({ name: k, value: v }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                  <XAxis dataKey="name" stroke="#6b7280" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                  <YAxis stroke="#6b7280" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                  <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {Object.entries(data.counts).map(([k], i) => <Cell key={i} fill={COLORS[k]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Posts feed */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-widest text-textSecondary mb-3">Live Posts</h3>
            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {data.posts.map((post, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-surface/30 hover:bg-surface/50 border border-white/5 rounded-xl transition-all group animate-fade-in" style={{ animationDelay: `${i * 0.03}s` }}>
                  <div className="relative mt-1 flex-shrink-0 h-3 w-3">
                    <span className="animate-radar absolute inset-0 rounded-full" style={{ backgroundColor: COLORS[post.Predicted_Sentiment], opacity: 0.5 }} />
                    <span className="relative block h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[post.Predicted_Sentiment] }} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest block mb-0.5" style={{ color: COLORS[post.Predicted_Sentiment] }}>{post.Predicted_Sentiment}</span>
                    <p className="text-xs text-textPrimary/80 line-clamp-2 leading-relaxed">{post.Text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Circular Score Ring ────────────────────────────────────────────────────
function ScoreRing({ score, size = 120, strokeWidth = 10 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const color = score >= 65 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444';
  const glow = score >= 65 ? 'rgba(16,185,129,0.6)' : score >= 40 ? 'rgba(245,158,11,0.6)' : 'rgba(239,68,68,0.6)';

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1.2s ease, stroke 0.4s', filter: `drop-shadow(0 0 6px ${glow})` }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-2xl font-extrabold" style={{ color }}>{score}</div>
        <div className="text-[10px] text-textSecondary uppercase tracking-wider">/ 100</div>
      </div>
    </div>
  );
}

// ─── Product Verdict ────────────────────────────────────────────────────────
function getVerdict(positivePercent) {
  if (positivePercent >= 65) return { label: '✅ Highly Recommended', color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: '#10b981' };
  if (positivePercent >= 45) return { label: '👍 Generally Positive', color: '#6d28d9', bg: 'rgba(109,40,217,0.12)', border: '#6d28d9' };
  if (positivePercent >= 30) return { label: '⚖️ Mixed Reviews', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: '#f59e0b' };
  return { label: '❌ Not Recommended', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: '#ef4444' };
}

// ─── TAB 3: YouTube ────────────────────────────────────────────────────────
function YouTubeTab() {
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(50);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [productName, setProductName] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true); setError(''); setData(null); setProductName(query.trim());
    try {
      const res = await axios.get(`${API_BASE}/youtube`, { params: { query, limit } });
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'No video or comments found.');
    } finally {
      setLoading(false);
    }
  };

  const totalComments = data ? data.comments.length : 0;

  // Compute sentiment score (0–100 based on positive%)
  const positiveCount = data?.counts?.Positive || 0;
  const negativeCount = data?.counts?.Negative || 0;
  const sentimentScore = totalComments > 0
    ? Math.round(((positiveCount - negativeCount * 0.5) / totalComments) * 100)
    : 0;
  const clampedScore = Math.max(0, Math.min(100, sentimentScore));
  const positivePct = totalComments > 0 ? Math.round((positiveCount / totalComments) * 100) : 0;
  const verdict = data ? getVerdict(positivePct) : null;

  // Top positive & negative comments
  const topPositive = data?.comments?.filter(c => c.Predicted_Sentiment === 'Positive').slice(0, 2) || [];
  const topNegative = data?.comments?.filter(c => c.Predicted_Sentiment === 'Negative').slice(0, 2) || [];

  return (
    <div className="glass-panel p-6 md:p-8 rounded-3xl animate-slide-up" style={{ borderTop: '2px solid #ff0000' }}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#ff0000] mb-1 flex items-center gap-2">
          <Youtube size={22} /> YouTube Product Intelligence
        </h2>
        <p className="text-textSecondary text-sm">Search a product to get a full sentiment report backed by viewer comments.</p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-textSecondary/50" size={16} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g., Samsung Galaxy S24 review"
            className="w-full bg-surface/30 border border-white/10 focus:border-[#ff0000]/50 focus:ring-2 focus:ring-[#ff0000]/20 rounded-xl py-3 pl-10 pr-4 text-white outline-none transition-all text-sm"
          />
        </div>
        <select
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          className="bg-surface/30 border border-white/10 rounded-xl px-4 py-3 text-white cursor-pointer outline-none"
        >
          {[20, 50, 100].map(v => <option key={v} value={v}>{v} Comments</option>)}
        </select>
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="btn-shine px-6 py-3 bg-gradient-to-r from-[#ff0000] to-[#cc0000] text-white rounded-xl font-bold disabled:opacity-40 flex items-center gap-2"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : 'Search'}
        </button>
      </form>

      {loading && (
        <div className="space-y-4 animate-fade-in">
          <div className="h-40 bg-surface/20 rounded-2xl shimmer" />
          <div className="h-16 bg-surface/20 rounded-2xl shimmer" />
          <div className="h-16 bg-surface/20 rounded-2xl shimmer" />
        </div>
      )}

      {error && <div className="p-4 bg-danger/10 border border-danger/20 rounded-xl text-danger flex gap-2 items-center text-sm animate-fade-in"><AlertCircle size={15}/>{error}</div>}

      {data && (
        <div className="animate-fade-in space-y-6">

          {/* ── PRODUCT REPORT CARD ────────────────────────────── */}
          <div
            className="rounded-3xl border p-6 md:p-8 relative overflow-hidden"
            style={{ borderColor: verdict.border, background: verdict.bg, boxShadow: `0 0 40px ${verdict.border}22` }}
          >
            {/* decorative glow bg */}
            <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(circle at 80% 50%, ${verdict.border}18 0%, transparent 70%)` }} />

            <div className="relative flex flex-col md:flex-row items-center md:items-start gap-8">
              {/* Sentiment Score Ring */}
              <div className="flex flex-col items-center gap-3 flex-shrink-0">
                <ScoreRing score={clampedScore} size={130} strokeWidth={12} />
                <div className="text-xs text-textSecondary uppercase tracking-widest font-semibold">Sentiment Score</div>
              </div>

              {/* Center info */}
              <div className="flex-1 text-center md:text-left">
                <div className="text-xs text-textSecondary uppercase tracking-widest mb-1 font-semibold">Product Report</div>
                <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-3 leading-tight capitalize">{productName}</h2>

                {/* Verdict Badge */}
                <div
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold mb-4 border"
                  style={{ color: verdict.color, borderColor: verdict.border, backgroundColor: `${verdict.border}18` }}
                >
                  {verdict.label}
                </div>

                {/* Mini stats */}
                <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                  {[
                    { label: 'Comments', val: totalComments, color: '#ffffff' },
                    { label: 'Positive', val: `${positivePct}%`, color: '#10b981' },
                    { label: 'Negative', val: `${Math.round((negativeCount / totalComments) * 100)}%`, color: '#ef4444' },
                  ].map(({ label, val, color }) => (
                    <div key={label} className="bg-surface/60 border border-white/10 rounded-xl px-4 py-2 text-center">
                      <div className="text-lg font-bold" style={{ color }}>{val}</div>
                      <div className="text-[10px] text-textSecondary uppercase tracking-wider">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Top comments highlight */}
            {(topPositive.length > 0 || topNegative.length > 0) && (
              <div className="relative mt-6 grid md:grid-cols-2 gap-4 border-t border-white/10 pt-6">
                {topPositive.length > 0 && (
                  <div>
                    <div className="text-xs font-bold uppercase tracking-widest text-green-400 mb-2 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> Top Positive Comment
                    </div>
                    <p className="text-xs text-textPrimary/80 italic bg-surface/40 p-3 rounded-xl leading-relaxed border border-white/5">
                      "{topPositive[0].Text}"
                    </p>
                  </div>
                )}
                {topNegative.length > 0 && (
                  <div>
                    <div className="text-xs font-bold uppercase tracking-widest text-red-400 mb-2 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Top Negative Comment
                    </div>
                    <p className="text-xs text-textPrimary/80 italic bg-surface/40 p-3 rounded-xl leading-relaxed border border-white/5">
                      "{topNegative[0].Text}"
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── YOUTUBE VIDEO INFO ─────────────────────────────── */}
          <div className="flex flex-col md:flex-row gap-5 bg-surface/30 border border-[#ff0000]/20 rounded-2xl p-5">
            <div className="relative group w-full md:w-52 flex-shrink-0 aspect-video rounded-xl overflow-hidden border border-white/10">
              <img src={data.video_info.thumbnail} alt={data.video_info.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-500 group-hover:scale-105" />
              <a href={data.video_info.link} target="_blank" rel="noreferrer" className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 bg-[#ff0000]/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-xl hover:scale-110 transition-transform">
                  <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[14px] border-l-white border-b-[8px] border-b-transparent ml-1" />
                </div>
              </a>
            </div>
            <div className="flex-1">
              <div className="text-[10px] font-bold text-[#ff0000] uppercase tracking-widest mb-1">Source Video (YouTube)</div>
              <h3 className="text-base font-bold text-white leading-snug mb-2">{data.video_info.title}</h3>
              <p className="text-textSecondary text-xs leading-relaxed line-clamp-2 mb-3">{data.video_info.description}</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: '📺 Channel', val: data.video_info.channel },
                  { label: '👁️ Views', val: parseInt(data.video_info.views || 0).toLocaleString() },
                ].map(({ label, val }) => (
                  <div key={label} className="bg-surface/60 border border-white/10 rounded-lg px-3 py-1.5 text-xs">
                    <div className="text-textSecondary mb-0.5">{label}</div>
                    <div className="font-semibold text-white">{val}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── SENTIMENT BREAKDOWN ─────────────────────────────── */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="h-[220px] bg-surface/20 rounded-2xl border border-white/5 p-3">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={Object.entries(data.counts).map(([k, v]) => ({ name: k, value: v }))}
                    cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" strokeWidth={0}>
                    {Object.entries(data.counts).map(([k], i) => <Cell key={i} fill={COLORS[k]} />)}
                  </Pie>
                  <RechartsTooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-surface/20 rounded-2xl border border-white/5 p-5 flex flex-col justify-center">
              {Object.entries(data.counts)
                .sort(([, a], [, b]) => b - a)
                .map(([sentiment, count]) => {
                  const pct = Math.round((count / totalComments) * 100);
                  return (
                    <div key={sentiment} className="mb-4 last:mb-0">
                      <div className="flex justify-between text-xs font-semibold mb-1.5">
                        <span style={{ color: COLORS[sentiment] }}>{sentiment}</span>
                        <span className="text-textSecondary"><CountUp target={pct} />%</span>
                      </div>
                      <div className="h-2 bg-surface rounded-full overflow-hidden">
                        <div className="h-2 rounded-full transition-all duration-1000" style={{ width: `${pct}%`, backgroundColor: COLORS[sentiment], boxShadow: `0 0 8px ${GLOW[sentiment]}` }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* ── COMMENT FEED ─────────────────────────────────────── */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-widest text-textSecondary mb-3 flex items-center gap-2">
              <Activity size={13} /> Comment Feed ({totalComments})
            </h3>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {data.comments.slice(0, 60).map((c, i) => (
                <div key={i} className="p-4 bg-surface/30 hover:bg-surface/50 border-l-4 border border-white/5 rounded-xl transition-all text-sm animate-fade-in" style={{ borderLeftColor: COLORS[c.Predicted_Sentiment], animationDelay: `${i * 0.025}s` }}>
                  <p className="text-textPrimary/85 leading-relaxed italic">"{c.Text}"</p>
                  <span className="mt-2 text-[10px] font-bold uppercase tracking-widest block" style={{ color: COLORS[c.Predicted_Sentiment] }}>{c.Predicted_Sentiment}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

