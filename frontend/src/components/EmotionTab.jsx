import { useState } from 'react';
import { Loader2, AlertCircle, Zap, Brain, Sparkles } from 'lucide-react';
import axios from 'axios';

const API_BASE = "http://localhost:8000";

const EMOTIONS = [
  { id: 'joy',      emoji: '😄', label: 'Joy',      color: '#f59e0b', bgColor: 'rgba(245,158,11,0.12)',  group: 'positive' },
  { id: 'surprise', emoji: '😲', label: 'Surprise',  color: '#06b6d4', bgColor: 'rgba(6,182,212,0.12)',   group: 'positive' },
  { id: 'neutral',  emoji: '😐', label: 'Neutral',   color: '#6b7280', bgColor: 'rgba(107,114,128,0.1)',  group: 'neutral'  },
  { id: 'sadness',  emoji: '😢', label: 'Sadness',   color: '#3b82f6', bgColor: 'rgba(59,130,246,0.12)',  group: 'negative' },
  { id: 'fear',     emoji: '😨', label: 'Fear',      color: '#8b5cf6', bgColor: 'rgba(139,92,246,0.12)',  group: 'negative' },
  { id: 'disgust',  emoji: '🤢', label: 'Disgust',   color: '#10b981', bgColor: 'rgba(16,185,129,0.12)',  group: 'negative' },
  { id: 'anger',    emoji: '😠', label: 'Anger',     color: '#ef4444', bgColor: 'rgba(239,68,68,0.12)',   group: 'negative' },
];

const EXAMPLE_TEXTS = [
  "This phone is absolutely incredible! I'm overjoyed with my purchase.",
  "The product broke in 3 days. I'm furious with the poor quality!",
  "I can't believe how bad this is. Disgusting experience overall.",
  "Not sure how I feel... it's okay I guess, nothing special.",
  "My heart dropped when it didn't turn on. So scared I wasted my money.",
];

function EmotionBar({ emotion, score, isTop }) {
  const pct = Math.round(score * 100);
  return (
    <div
      className={`p-3 rounded-xl border transition-all duration-500 ${isTop ? 'border-opacity-60 scale-[1.02]' : 'border-white/5'}`}
      style={isTop ? { borderColor: emotion.color, background: emotion.bgColor, boxShadow: `0 0 20px ${emotion.color}30` } : { background: 'rgba(255,255,255,0.02)' }}
    >
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl">{emotion.emoji}</span>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className={`font-bold text-sm ${isTop ? 'text-white' : 'text-textSecondary'}`}>{emotion.label}</span>
            <span className="text-xs font-mono font-bold" style={{ color: emotion.color }}>{pct}%</span>
          </div>
        </div>
      </div>
      <div className="h-2 bg-surface/60 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{
            width: `${pct}%`,
            backgroundColor: emotion.color,
            boxShadow: isTop ? `0 0 8px ${emotion.color}` : 'none'
          }}
        />
      </div>
    </div>
  );
}

export default function EmotionTab() {
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
      const res = await axios.post(`${API_BASE}/emotion`, { text });
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Emotion detection failed. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  // Build score map for lookup
  const scoreMap = {};
  if (data) data.scores.forEach(s => { scoreMap[s.label] = s.score; });

  const dominant = data ? EMOTIONS.find(e => e.id === data.dominant) : null;

  return (
    <div className="glass-panel p-6 md:p-8 rounded-3xl animate-slide-up neon-border">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-1 flex items-center gap-2">
          <Brain className="text-purple-400" size={22} />
          Emotion Detection Engine
        </h2>
        <p className="text-textSecondary text-sm">
          Deep learning model detects 7 human emotions: Anger, Disgust, Fear, Joy, Neutral, Sadness, Surprise.
          Powered by <span className="text-accent">distilroberta-base</span>.
        </p>
      </div>

      <form onSubmit={handleAnalyze} className="mb-8">
        <div className="relative mb-3">
          <textarea
            rows={4}
            value={text}
            onChange={e => { setText(e.target.value); setCharCount(e.target.value.length); }}
            maxLength={512}
            placeholder="Type a review, tweet, or comment to detect the human emotion behind it..."
            className="w-full bg-surface/30 border border-white/10 focus:border-purple-500/60 rounded-2xl p-5 text-white placeholder-textSecondary/40 focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all resize-none text-sm leading-relaxed"
          />
          <div className="absolute bottom-3 right-4 text-xs text-textSecondary/50 font-mono">{charCount}/512</div>
        </div>

        {/* Example buttons */}
        <div className="flex flex-wrap gap-2 mb-4">
          {EXAMPLE_TEXTS.map((ex, i) => (
            <button
              key={i}
              type="button"
              onClick={() => { setText(ex); setCharCount(ex.length); }}
              className="text-xs px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-textSecondary hover:text-white transition-all"
            >
              {ex.slice(0, 28)}…
            </button>
          ))}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading || !text.trim()}
            className="btn-shine px-7 py-3 bg-gradient-to-r from-purple-600 to-violet-500 text-white rounded-2xl font-semibold transition-all shadow-lg shadow-purple-500/20 disabled:opacity-40 flex items-center gap-2"
          >
            {loading ? <><Loader2 size={18} className="animate-spin" /> Detecting…</> : <><Sparkles size={18} /> Detect Emotion</>}
          </button>
        </div>
      </form>

      {error && (
        <div className="p-4 bg-danger/10 border border-danger/20 rounded-xl text-danger flex items-center gap-2 mb-6 animate-fade-in text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {loading && (
        <div className="text-center py-12 text-textSecondary animate-fade-in">
          <Brain size={40} className="animate-pulse mx-auto mb-3 text-purple-400 opacity-60" />
          <div className="text-sm">Loading emotion model on first run (may take ~30 seconds)…</div>
        </div>
      )}

      {data && dominant && (
        <div className="animate-fade-in space-y-8 border-t border-white/10 pt-8">
          {/* Big dominant emotion */}
          <div
            className="flex flex-col md:flex-row items-center gap-6 p-6 rounded-3xl border"
            style={{ borderColor: dominant.color, background: dominant.bgColor, boxShadow: `0 0 40px ${dominant.color}25` }}
          >
            <div className="text-8xl animate-float" style={{ filter: `drop-shadow(0 0 20px ${dominant.color})` }}>
              {dominant.emoji}
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-widest mb-1 text-textSecondary">Detected Emotion</div>
              <div className="text-5xl font-extrabold capitalize" style={{ color: dominant.color }}>
                {dominant.label}
              </div>
              <div className="text-sm text-textSecondary mt-1.5">
                Confidence: <span className="font-bold" style={{ color: dominant.color }}>
                  {Math.round((scoreMap[data.dominant] || 0) * 100)}%
                </span>
              </div>
            </div>
          </div>

          {/* All emotion bars */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-textSecondary mb-4">Full Breakdown</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {EMOTIONS
                .filter(e => scoreMap[e.id] !== undefined)
                .sort((a, b) => (scoreMap[b.id] || 0) - (scoreMap[a.id] || 0))
                .map(emotion => (
                  <EmotionBar
                    key={emotion.id}
                    emotion={emotion}
                    score={scoreMap[emotion.id] || 0}
                    isTop={emotion.id === data.dominant}
                  />
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
