import { useState } from 'react';
import { Loader2, AlertCircle, Globe, Languages, Sparkles } from 'lucide-react';
import axios from 'axios';

const API_BASE = "http://localhost:8000";

const EXAMPLE_TEXTS = [
  "Intha phone romba nalla irukku, but battery konjam worst.",
  "Bhai, yeh product ekdum mast hai! Paisa vasool.",
  "The build quality is vera level, absolutely love it.",
  "Idhu waste ah pochu, total disappointment thaan.",
];

const SENTIMENT_COLORS = {
  Positive: '#10b981',
  Negative: '#ef4444',
  Neutral: '#6b7280',
};

export default function MultilingualTab() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true); setError(''); setData(null);
    try {
      const res = await axios.post(`${API_BASE}/multilingual`, { text });
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Analysis failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel p-6 md:p-8 rounded-3xl animate-slide-up border-t-2 border-emerald-500">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-1 flex items-center gap-2 text-emerald-400">
          <Globe size={22} /> Multilingual & Code-Mixed NLP
        </h2>
        <p className="text-textSecondary text-sm">
          Analyzes sentiment in 100+ languages including regional scripts, Thanglish, and Hinglish using XLM-RoBERTa.
        </p>
      </div>

      <form onSubmit={handleAnalyze} className="mb-8">
        <textarea
          rows={4}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Type in Tamil, Hindi, Thanglish, Hinglish, English..."
          className="w-full bg-surface/30 border border-white/10 focus:border-emerald-500/60 rounded-2xl p-5 text-white placeholder-textSecondary/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all resize-none text-sm mb-3"
        />
        <div className="flex flex-wrap gap-2 mb-4">
          {EXAMPLE_TEXTS.map((ex, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setText(ex)}
              className="text-xs px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-textSecondary hover:text-white transition-all"
            >
              Ex {i + 1}
            </button>
          ))}
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading || !text.trim()}
            className="btn-shine px-7 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold disabled:opacity-40 flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
          >
            {loading ? <><Loader2 size={18} className="animate-spin" /> Analyzing…</> : <><Sparkles size={18} /> Analyze Dialect</>}
          </button>
        </div>
      </form>

      {error && (
        <div className="p-4 bg-danger/10 border border-danger/20 rounded-xl text-danger flex items-center gap-2 text-sm animate-fade-in mb-6">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {loading && (
        <div className="text-center py-12 text-textSecondary animate-fade-in">
          <Languages size={40} className="animate-pulse mx-auto mb-3 text-emerald-400 opacity-60" />
          <div className="text-sm">Initializing Cross-Lingual Model (takes ~20s on first run)…</div>
        </div>
      )}

      {data && (
        <div className="animate-fade-in space-y-6 border-t border-white/10 pt-8">
          <div className="flex flex-col md:flex-row gap-6">
            
            <div className="flex-1 p-6 rounded-3xl border border-emerald-500/30 bg-emerald-500/10 text-center flex flex-col justify-center items-center relative overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent pointer-events-none" />
               <div className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-2 relative z-10">Detected Language / Script</div>
               <div className="text-4xl font-extrabold text-white relative z-10">{data.language}</div>
            </div>

            <div className="flex-1 p-6 rounded-3xl border text-center flex flex-col justify-center items-center relative overflow-hidden"
                 style={{ borderColor: `${SENTIMENT_COLORS[data.sentiment]}50`, backgroundColor: `${SENTIMENT_COLORS[data.sentiment]}15` }}>
               <div className="text-xs font-bold uppercase tracking-widest text-textSecondary mb-2 relative z-10">Sentiment</div>
               <div className="text-5xl font-extrabold relative z-10 drop-shadow-lg" style={{ color: SENTIMENT_COLORS[data.sentiment] }}>
                  {data.sentiment}
               </div>
               <div className="mt-2 text-sm text-textSecondary relative z-10">
                 Confidence: <span className="font-bold text-white">{Math.round(data.confidence * 100)}%</span>
               </div>
            </div>

          </div>

          <div className="bg-surface/30 p-5 rounded-2xl border border-white/5">
            <h3 className="text-xs font-bold uppercase tracking-widest text-textSecondary mb-4">Probability Distribution</h3>
            <div className="space-y-3">
              {data.scores.map((s) => (
                <div key={s.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-white font-medium">{s.label}</span>
                    <span className="text-textSecondary">{Math.round(s.score * 100)}%</span>
                  </div>
                  <div className="h-1.5 bg-surface/60 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-1000"
                      style={{ width: `${s.score * 100}%`, backgroundColor: SENTIMENT_COLORS[s.label] || '#4b5563' }}
                    />
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
