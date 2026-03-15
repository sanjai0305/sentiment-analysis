import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Flame, RefreshCw, AlertCircle, Trophy, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const COLORS = {
  Positive: '#10b981',
  Negative: '#ef4444',
  Neutral: '#6b7280',
  Irrelevant: '#f59e0b',
};

function ScoreRing({ score, size = 80, strokeWidth = 7 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 65 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444';
  const glow = score >= 65 ? 'rgba(16,185,129,0.6)' : score >= 40 ? 'rgba(245,158,11,0.6)' : 'rgba(239,68,68,0.6)';
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={strokeWidth} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1.2s ease', filter: `drop-shadow(0 0 5px ${glow})` }} />
      </svg>
      <div className="absolute text-center">
        <div className="text-base font-extrabold" style={{ color }}>{score}</div>
        <div className="text-[8px] text-textSecondary">/100</div>
      </div>
    </div>
  );
}

function RankBadge({ rank }) {
  const cfg = rank === 1
    ? { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', icon: '🥇' }
    : rank === 2
    ? { color: '#9ca3af', bg: 'rgba(156,163,175,0.12)', icon: '🥈' }
    : rank === 3
    ? { color: '#cd7c3a', bg: 'rgba(205,124,58,0.12)', icon: '🥉' }
    : { color: '#4b5563', bg: 'rgba(75,85,99,0.1)', icon: `#${rank}` };
  return (
    <div className="w-8 h-8 flex items-center justify-center rounded-lg text-sm font-bold"
      style={{ color: cfg.color, background: cfg.bg }}>
      {cfg.icon}
    </div>
  );
}

function SubredditCard({ topic, rank }) {
  const TrendIcon = topic.positive_pct >= 60 ? TrendingUp : topic.positive_pct <= 30 ? TrendingDown : Minus;
  const trendColor = topic.positive_pct >= 60 ? '#10b981' : topic.positive_pct <= 30 ? '#ef4444' : '#6b7280';
  const scoreColor = topic.score >= 65 ? '#10b981' : topic.score >= 40 ? '#f59e0b' : '#ef4444';

  return (
    <div className="glass-panel p-4 rounded-2xl border border-white/5 hover:border-white/15 transition-all group animate-fade-in"
      style={{ animationDelay: `${rank * 0.04}s` }}>
      <div className="flex items-center gap-4">
        {/* Rank */}
        <RankBadge rank={rank} />

        {/* Subreddit info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-white">r/{topic.subreddit}</span>
            <TrendIcon size={13} style={{ color: trendColor }} />
          </div>
          <div className="text-[10px] text-textSecondary mt-0.5">{topic.total} posts analyzed</div>
        </div>

        {/* Score ring */}
        <ScoreRing score={topic.score} size={72} strokeWidth={6} />
      </div>

      {/* Sentiment bar */}
      <div className="mt-3 space-y-1.5">
        <div className="flex rounded-full overflow-hidden h-2 gap-0.5">
          {Object.entries(topic.counts).filter(([, v]) => v > 0).map(([sentiment, count]) => (
            <div key={sentiment} className="h-full transition-all duration-700"
              style={{
                width: `${(count / topic.total) * 100}%`,
                backgroundColor: COLORS[sentiment],
                boxShadow: `0 0 6px ${COLORS[sentiment]}80`,
              }} />
          ))}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
          {Object.entries(topic.counts).filter(([, v]) => v > 0).map(([sentiment, count]) => (
            <span key={sentiment} className="text-[10px] text-textSecondary">
              <span style={{ color: COLORS[sentiment] }} className="font-semibold">{sentiment}</span>
              {' '}{Math.round((count / topic.total) * 100)}%
            </span>
          ))}
        </div>
      </div>

      {/* Top post preview */}
      {topic.top_post && (
        <p className="mt-3 text-xs text-textSecondary/70 italic line-clamp-2 bg-surface/40 p-2 rounded-lg border border-white/5">
          "{topic.top_post}"
        </p>
      )}
    </div>
  );
}

export default function TrendingTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchTrending = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await axios.get(`${API_BASE}/trending`);
      setData(res.data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch trending data. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTrending(); }, [fetchTrending]);

  const topSentiment = data?.topics?.[0]?.score >= 65 ? 'Bullish 🚀' : data?.topics?.[0]?.score >= 40 ? 'Neutral 😐' : 'Bearish 📉';

  return (
    <div className="glass-panel p-6 md:p-8 rounded-3xl animate-slide-up neon-border space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-warning/20">
            <Flame size={22} className="text-warning" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Trending Sentiment</h2>
            <p className="text-textSecondary text-sm">Real-time Reddit community mood across major topics.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-textSecondary/60">Updated {lastUpdated.toLocaleTimeString()}</span>
          )}
          <button onClick={fetchTrending} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-textSecondary hover:text-white transition-all text-sm font-medium">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Fetching…' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-danger/10 border border-danger/20 rounded-xl text-danger flex items-center gap-2 text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {loading && !data && (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-surface/20 rounded-2xl shimmer" style={{ animationDelay: `${i * 0.1}s` }} />
          ))}
          <div className="text-center text-xs text-textSecondary/60 py-2">
            Fetching real-time data from Reddit… this may take 30–60 seconds.
          </div>
        </div>
      )}

      {data && data.topics?.length > 0 && (
        <>
          {/* Overview bar */}
          <div className="flex flex-wrap gap-3">
            {[
              { label: 'Topics', val: data.topics.length, color: '#6d28d9' },
              { label: 'Market Mood', val: topSentiment, color: '#f59e0b' },
              { label: 'Top Score', val: data.topics[0]?.score + '/100', color: '#10b981' },
            ].map(({ label, val, color }) => (
              <div key={label} className="glass-panel flex items-center gap-3 px-4 py-2.5 rounded-xl border border-white/5 flex-1 min-w-[130px]">
                <div>
                  <div className="text-xs text-textSecondary uppercase tracking-widest">{label}</div>
                  <div className="font-bold text-sm" style={{ color }}>{val}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Leaderboard */}
          <div>
            <div className="text-xs text-textSecondary uppercase tracking-widest font-semibold mb-3 flex items-center gap-2">
              <Trophy size={12} /> Sentiment Leaderboard
            </div>
            <div className="space-y-3">
              {data.topics.map((topic, i) => (
                <SubredditCard key={topic.subreddit} topic={topic} rank={i + 1} />
              ))}
            </div>
          </div>
        </>
      )}

      {data && data.topics?.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Flame size={48} className="text-textSecondary/30 mb-4" />
          <div className="text-lg font-semibold text-textSecondary">No trending data</div>
          <p className="text-sm text-textSecondary/60 max-w-xs mt-1">
            Could not retrieve Reddit data. Check your network connection and try refreshing.
          </p>
        </div>
      )}
    </div>
  );
}
