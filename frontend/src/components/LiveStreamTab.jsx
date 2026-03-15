import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Radio, Wifi, WifiOff, Flame, TrendingUp, TrendingDown, Minus,
  BarChart2, Hash, Activity, Loader2, AlertCircle, RefreshCw
} from 'lucide-react';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell,
  ResponsiveContainer, Tooltip as RechartsTooltip
} from 'recharts';

const API_BASE = "http://localhost:8000";

const COLORS = {
  Positive: '#10b981',
  Negative: '#ef4444',
  Neutral: '#6b7280',
  Irrelevant: '#f59e0b',
};

const GLOW = {
  Positive: 'rgba(16,185,129,0.6)',
  Negative: 'rgba(239,68,68,0.6)',
  Neutral: 'rgba(107,114,128,0.4)',
  Irrelevant: 'rgba(245,158,11,0.6)',
};

const SUBREDDITS = [
  'worldnews', 'technology', 'gaming', 'movies', 'stocks',
  'politics', 'science', 'AskReddit', 'entertainment', 'sports'
];

// ─── Sentiment Ticker Item ────────────────────────────────────────────────
function TickerItem({ post, index }) {
  const color = COLORS[post.sentiment] || '#6b7280';
  const Icon = post.sentiment === 'Positive' ? TrendingUp
    : post.sentiment === 'Negative' ? TrendingDown : Minus;

  return (
    <div
      className="flex items-start gap-3 p-3 rounded-xl border border-white/5 bg-surface/30
                 hover:bg-surface/60 transition-all group cursor-default animate-slide-up"
      style={{
        borderLeftWidth: 3,
        borderLeftColor: color,
        animationDelay: `${index * 0.05}s`,
        boxShadow: `inset 3px 0 0 ${color}`
      }}
    >
      <div className="flex-shrink-0 mt-0.5 relative">
        <span className="animate-radar absolute inset-0 rounded-full" style={{ backgroundColor: color, opacity: 0.5 }} />
        <Icon size={14} style={{ color }} className="relative z-10" />
      </div>
      <div className="flex-1 min-w-0">
        <span
          className="text-[10px] font-bold uppercase tracking-widest block mb-0.5"
          style={{ color }}
        >
          {post.sentiment}
        </span>
        <p className="text-xs text-textPrimary/80 line-clamp-2 leading-relaxed">
          {post.text}
        </p>
      </div>
      <div className="text-[9px] text-textSecondary/50 flex-shrink-0 pt-0.5 font-mono">
        {new Date(post.timestamp * 1000).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </div>
    </div>
  );
}

// ─── Sentiment Meter (horizontal bar) ────────────────────────────────────
function SentimentMeter({ counts }) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) return null;
  return (
    <div className="flex rounded-full overflow-hidden h-3 gap-px w-full">
      {Object.entries(counts).filter(([, v]) => v > 0).map(([k, v]) => (
        <div
          key={k}
          className="h-full transition-all duration-700"
          style={{
            width: `${(v / total) * 100}%`,
            backgroundColor: COLORS[k],
            boxShadow: `0 0 6px ${GLOW[k]}`
          }}
        />
      ))}
    </div>
  );
}

// ─── Trending Topic Card ────────────────────────────────────────────────
function TopicCard({ topic, rank }) {
  const color = topic.score >= 60 ? COLORS.Positive
    : topic.score >= 35 ? COLORS.Neutral : COLORS.Negative;

  const verdict = topic.score >= 60 ? '🟢 Bullish'
    : topic.score >= 35 ? '🟡 Neutral' : '🔴 Bearish';

  return (
    <div
      className="p-4 rounded-2xl border border-white/5 bg-surface/30 hover:bg-surface/50 transition-all
                 hover:scale-[1.02] cursor-default group animate-fade-in"
      style={{ animationDelay: `${rank * 0.07}s` }}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-[10px] text-textSecondary uppercase tracking-widest mb-0.5">#{rank + 1}</div>
          <div className="font-bold text-sm text-white">r/{topic.subreddit}</div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-extrabold" style={{ color }}>{topic.score}</div>
          <div className="text-[9px] text-textSecondary uppercase tracking-wider">/ 100</div>
        </div>
      </div>

      {/* Sentiment bar */}
      <SentimentMeter counts={topic.counts} />

      <div className="flex items-center justify-between mt-2">
        <div className="text-[10px] font-semibold" style={{ color }}>{verdict}</div>
        <div className="text-[10px] text-textSecondary">{topic.total} posts analyzed</div>
      </div>

      {topic.top_post && (
        <p className="mt-2 text-[10px] text-textSecondary/60 italic line-clamp-1">
          "{topic.top_post}"
        </p>
      )}
    </div>
  );
}

// ─── Keyword Bubble ───────────────────────────────────────────────────────
function KeywordBubble({ word, count, maxCount }) {
  const pct = count / maxCount;
  const size = 10 + pct * 10; // 10–20px font size

  return (
    <div
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/10
                 bg-white/5 hover:bg-white/10 transition-all cursor-default animate-fade-in"
      style={{ fontSize: size }}
    >
      <Hash size={size - 2} className="text-accent opacity-70" />
      <span className="text-white font-medium">{word}</span>
      <span className="text-textSecondary/60 text-[9px]">{count}</span>
    </div>
  );
}

// ─── MAIN LIVE STREAM TAB ────────────────────────────────────────────────
export default function LiveStreamTab() {
  const [subreddit, setSubreddit] = useState('worldnews');
  const [connected, setConnected] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [posts, setPosts] = useState([]);
  const [counts, setCounts] = useState({ Positive: 0, Negative: 0, Neutral: 0, Irrelevant: 0 });
  const [totalAnalyzed, setTotalAnalyzed] = useState(0);
  const [error, setError] = useState('');

  const [trendingData, setTrendingData] = useState(null);
  const [trendingLoading, setTrendingLoading] = useState(false);
  const [keywords, setKeywords] = useState([]);

  const eventSourceRef = useRef(null);
  const feedRef = useRef(null);

  // Auto-scroll to top of feed when new posts arrive
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = 0;
    }
  }, [posts.length]);

  const startStream = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setError('');
    setPosts([]);
    setCounts({ Positive: 0, Negative: 0, Neutral: 0, Irrelevant: 0 });
    setTotalAnalyzed(0);
    setStreaming(true);
    setConnected(false);

    const url = `${API_BASE}/stream/reddit?subreddit=${encodeURIComponent(subreddit)}&interval=20`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);

        if (data.type === 'connected') {
          setConnected(true);
        } else if (data.type === 'post') {
          setPosts(prev => [{ ...data, id: Date.now() + Math.random() }, ...prev.slice(0, 99)]);
          setCounts(prev => ({
            ...prev,
            [data.sentiment]: (prev[data.sentiment] || 0) + 1
          }));
          // Update keywords from first word of text
          const words = data.text.split(/\s+/).filter(w => w.length > 5).slice(0, 3);
          setKeywords(prev => {
            const map = {};
            prev.forEach(k => { map[k.word] = k.count; });
            words.forEach(w => {
              const clean = w.replace(/[^a-zA-Z]/g, '').toLowerCase();
              if (clean.length > 4) map[clean] = (map[clean] || 0) + 1;
            });
            return Object.entries(map)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 30)
              .map(([word, count]) => ({ word, count }));
          });
        } else if (data.type === 'stats') {
          setTotalAnalyzed(data.total_analyzed);
        } else if (data.type === 'error') {
          setError(data.message);
        }
      } catch (err) {
        console.error('SSE parse error:', err);
      }
    };

    es.onerror = () => {
      setConnected(false);
      setStreaming(false);
      setError('Connection lost. The stream ended or the server restarted.');
      es.close();
    };
  }, [subreddit]);

  const stopStream = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setStreaming(false);
    setConnected(false);
  }, []);

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) eventSourceRef.current.close();
    };
  }, []);

  const fetchTrending = async () => {
    setTrendingLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/trending`);
      setTrendingData(res.data);
    } catch (err) {
      setError('Could not load trending topics.');
    } finally {
      setTrendingLoading(false);
    }
  };

  const totalPosts = Object.values(counts).reduce((a, b) => a + b, 0);
  const positivePct = totalPosts > 0 ? Math.round((counts.Positive / totalPosts) * 100) : 0;

  const chartData = Object.entries(counts)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: k, value: v }));

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Tab Switcher: Live Feed / Trending ────────────────────── */}
      <div className="glass-panel rounded-3xl p-6 md:p-8 border-t-2 border-t-red-500">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2 mb-1">
              <span className="relative flex h-3 w-3">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'} opacity-75`} />
                <span className={`relative inline-flex rounded-full h-3 w-3 ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
              </span>
              Live Reddit Stream
            </h2>
            <p className="text-textSecondary text-sm">Real-time sentiment analysis — posts stream as they appear on Reddit.</p>
          </div>
          <div className="flex items-center gap-3">
            {connected
              ? <span className="text-xs font-bold text-green-400 flex items-center gap-1.5 bg-green-400/10 border border-green-400/20 px-3 py-1.5 rounded-full"><Wifi size={12} /> LIVE</span>
              : streaming
              ? <span className="text-xs font-bold text-yellow-400 flex items-center gap-1.5 bg-yellow-400/10 border border-yellow-400/20 px-3 py-1.5 rounded-full"><Loader2 size={12} className="animate-spin" /> CONNECTING</span>
              : <span className="text-xs font-bold text-textSecondary flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full"><WifiOff size={12} /> OFFLINE</span>
            }
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[160px]">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-textSecondary font-bold text-sm">r/</span>
            <select
              value={subreddit}
              onChange={(e) => { setSubreddit(e.target.value); if (streaming) stopStream(); }}
              className="w-full bg-surface/30 border border-white/10 rounded-xl py-3 pl-9 pr-4 text-white outline-none text-sm"
            >
              {SUBREDDITS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {!streaming
            ? <button
                onClick={startStream}
                className="btn-shine flex-1 min-w-[140px] px-5 py-3 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all"
              >
                <Radio size={16} /> Start Stream
              </button>
            : <button
                onClick={stopStream}
                className="flex-1 min-w-[140px] px-5 py-3 bg-surface/60 border border-white/10 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-surface/80 transition-all"
              >
                <WifiOff size={16} /> Stop Stream
              </button>
          }
        </div>

        {error && (
          <div className="p-3 bg-danger/10 border border-danger/20 rounded-xl text-danger flex gap-2 items-center text-sm mb-4 animate-fade-in">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        {/* Live Stats Row */}
        {totalPosts > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 animate-fade-in">
            {[
              { label: 'Posts Analyzed', val: totalPosts, color: '#ffffff' },
              { label: 'Positive Mood', val: `${positivePct}%`, color: COLORS.Positive },
              { label: 'Positive', val: counts.Positive, color: COLORS.Positive },
              { label: 'Negative', val: counts.Negative, color: COLORS.Negative },
            ].map(({ label, val, color }) => (
              <div key={label} className="glass-panel rounded-2xl p-3 text-center border border-white/5">
                <div className="text-2xl font-extrabold" style={{ color }}>{val}</div>
                <div className="text-[10px] text-textSecondary uppercase tracking-wider">{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Two-column layout: Feed + Chart */}
        {totalPosts > 0 && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Live feed */}
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-textSecondary mb-3 flex items-center gap-2">
                <Activity size={12} /> Live Post Feed
              </div>
              <div
                ref={feedRef}
                className="space-y-2 max-h-[440px] overflow-y-auto pr-1"
              >
                {posts.map((post, i) => (
                  <TickerItem key={post.id} post={post} index={i} />
                ))}
                {posts.length === 0 && connected && (
                  <div className="text-center text-textSecondary py-8 text-sm">
                    <Loader2 size={20} className="animate-spin mx-auto mb-2" />
                    Waiting for posts…
                  </div>
                )}
              </div>
            </div>

            {/* Right: Chart + Keyword Cloud */}
            <div className="space-y-4">
              {/* Bar chart */}
              <div className="h-[200px] bg-surface/20 rounded-2xl border border-white/5 p-3">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-textSecondary mb-2">Live Sentiment Distribution</div>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                    <XAxis dataKey="name" stroke="#6b7280" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                    <YAxis stroke="#6b7280" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                    <RechartsTooltip
                      cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                      contentStyle={{ backgroundColor: '#12121c', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {chartData.map((entry, i) => (
                        <Cell key={i} fill={COLORS[entry.name]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Keyword Cloud */}
              {keywords.length > 0 && (
                <div className="bg-surface/20 rounded-2xl border border-white/5 p-4">
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-textSecondary mb-3 flex items-center gap-2">
                    <Hash size={11} /> Trending Keywords
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {keywords.slice(0, 20).map(({ word, count }) => (
                      <KeywordBubble
                        key={word}
                        word={word}
                        count={count}
                        maxCount={keywords[0]?.count || 1}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Meter */}
              {totalPosts > 0 && (
                <div className="bg-surface/20 rounded-2xl border border-white/5 p-4">
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-textSecondary mb-3">Sentiment Ratio</div>
                  <SentimentMeter counts={counts} />
                  <div className="flex flex-wrap gap-3 mt-3">
                    {Object.entries(counts).filter(([, v]) => v > 0).map(([k, v]) => (
                      <div key={k} className="flex items-center gap-1.5 text-xs">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[k] }} />
                        <span style={{ color: COLORS[k] }} className="font-medium">{k}</span>
                        <span className="text-textSecondary/60">{Math.round((v / totalPosts) * 100)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!streaming && posts.length === 0 && (
          <div className="text-center py-16 text-textSecondary">
            <Radio size={40} className="mx-auto mb-4 opacity-20" />
            <div className="text-lg font-semibold mb-1">Start the Live Stream</div>
            <div className="text-sm opacity-60">Pick a subreddit and click <strong>Start Stream</strong> to analyze posts in real time.</div>
          </div>
        )}
      </div>

      {/* ── TRENDING TOPICS SECTION ──────────────────────────────────── */}
      <div className="glass-panel rounded-3xl p-6 md:p-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2 mb-1">
              <Flame className="text-orange-400" size={22} />
              Trending Topic Pulse
            </h2>
            <p className="text-textSecondary text-sm">Instant sentiment scan across 10 major subreddits. Refreshes on demand.</p>
          </div>
          <button
            onClick={fetchTrending}
            disabled={trendingLoading}
            className="btn-shine px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-bold flex items-center gap-2 disabled:opacity-50 transition-all"
          >
            {trendingLoading
              ? <><Loader2 size={16} className="animate-spin" /> Scanning…</>
              : <><RefreshCw size={16} /> Scan Trending</>
            }
          </button>
        </div>

        {trendingLoading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-32 bg-surface/20 rounded-2xl shimmer" />
            ))}
          </div>
        )}

        {trendingData && !trendingLoading && (
          <div className="animate-fade-in space-y-4">
            {/* Summary bar */}
            <div className="flex flex-wrap gap-3 pb-4 border-b border-white/10">
              <div className="text-xs text-textSecondary">
                Scanned at{' '}
                <span className="text-accent font-mono">
                  {new Date(trendingData.timestamp * 1000).toLocaleTimeString()}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-medium">
                🏆 Top Topic:{' '}
                <span className="text-green-400 font-bold">r/{trendingData.topics[0]?.subreddit}</span>
                <span className="text-textSecondary">({trendingData.topics[0]?.score}/100)</span>
              </div>
            </div>

            {/* Topic cards grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {trendingData.topics.map((topic, i) => (
                <TopicCard key={topic.subreddit} topic={topic} rank={i} />
              ))}
            </div>

            {/* Full sentiment bar across all topics */}
            <div className="bg-surface/20 rounded-2xl border border-white/5 p-5">
              <div className="text-xs font-semibold uppercase tracking-widest text-textSecondary mb-3">
                <BarChart2 size={12} className="inline mr-1.5" />
                Overall Mood Across All Topics
              </div>
              {(() => {
                const total_counts = { Positive: 0, Negative: 0, Neutral: 0, Irrelevant: 0 };
                trendingData.topics.forEach(t => {
                  Object.keys(total_counts).forEach(k => {
                    total_counts[k] += t.counts[k] || 0;
                  });
                });
                const grand = Object.values(total_counts).reduce((a, b) => a + b, 0);
                return (
                  <div className="space-y-3">
                    <SentimentMeter counts={total_counts} />
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      {Object.entries(total_counts).map(([k, v]) => (
                        <div key={k} className="text-center">
                          <div className="text-lg font-bold" style={{ color: COLORS[k] }}>
                            {grand > 0 ? Math.round((v / grand) * 100) : 0}%
                          </div>
                          <div className="text-[10px] text-textSecondary uppercase tracking-wider">{k}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {!trendingData && !trendingLoading && (
          <div className="text-center py-12 text-textSecondary">
            <Flame size={40} className="mx-auto mb-4 opacity-20" />
            <div className="text-base font-semibold mb-1">Click "Scan Trending" to analyze Reddit</div>
            <div className="text-sm opacity-60">We'll scan 10 major subreddits and rank them by sentiment score.</div>
          </div>
        )}
      </div>
    </div>
  );
}
