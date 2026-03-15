import { useState } from 'react';
import { Loader2, AlertCircle, Frown, ArrowRight, Zap } from 'lucide-react';
import axios from 'axios';

const API_BASE = "http://localhost:8000";

const EXAMPLE_TEXTS = [
  "Wow, what a GREAT phone, the battery died in exactly 2 hours.",
  "Oh sure, I absolutely LOVE waiting on hold for 45 minutes.",
  "Excellent customer service! They fixed my issue in 5 minutes.",
  "Brilliant design. The screen cracked the first time I touched it.",
];

export default function SarcasmTab() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true); setError(''); setData(null);
    try {
      const res = await axios.post(`${API_BASE}/sarcasm`, { text });
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Analysis failed.');
    } finally {
      setLoading(false);
    }
  };

  const getSentColor = (s) => s === 'Positive' ? '#10b981' : s === 'Negative' ? '#ef4444' : '#6b7280';

  return (
    <div className="glass-panel p-6 md:p-8 rounded-3xl animate-slide-up border-t-2 border-indigo-500">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-1 flex items-center gap-2 text-indigo-400">
          <Frown size={22} /> Sarcasm & Irony Engine
        </h2>
        <p className="text-textSecondary text-sm">
          Recalibrates false positives. If a user is being sarcastic, this engine catches it and flips the sentiment appropriately.
        </p>
      </div>

      <form onSubmit={handleAnalyze} className="mb-8">
        <textarea
          rows={3}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Enter a potentially sarcastic review..."
          className="w-full bg-surface/30 border border-white/10 focus:border-indigo-500/60 rounded-2xl p-5 text-white placeholder-textSecondary/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all resize-none text-sm mb-3"
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
            className="btn-shine px-7 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold disabled:opacity-40 flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/20"
          >
            {loading ? <><Loader2 size={18} className="animate-spin" /> Digging deeper…</> : <><Zap size={18} /> Detect Sarcasm</>}
          </button>
        </div>
      </form>

      {error && (
        <div className="p-4 bg-danger/10 border border-danger/20 rounded-xl text-danger flex items-center gap-2 text-sm animate-fade-in mb-6">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {data && (
        <div className="animate-fade-in space-y-6 border-t border-white/10 pt-8">
          
          <div className={`p-6 rounded-3xl border flex flex-col md:flex-row items-center gap-6 ${data.is_sarcastic ? 'bg-indigo-500/10 border-indigo-500/50' : 'bg-surface/30 border-white/10'}`}>
            <div className="text-6xl animate-bounce">
              {data.is_sarcastic ? '🤨' : '😐'}
            </div>
            <div className="flex-1 text-center md:text-left">
              <div className="text-2xl font-bold text-white mb-2">
                {data.is_sarcastic ? 'Sarcasm Detected!' : 'No Sarcasm Detected.'}
              </div>
              <p className="text-textSecondary text-sm">{data.explanation}</p>
              <div className="mt-3 text-xs text-textSecondary/60 font-mono">
                Method: {data.method} | Confidence: {data.is_sarcastic ? Math.round(data.sarcasm_confidence * 100) : '--'}%
              </div>
            </div>
          </div>

          {/* Recalibration flow */}
          <div className="flex items-center justify-center gap-4 py-8">
            <div className="text-center w-32">
              <div className="text-[10px] font-bold uppercase tracking-widest text-textSecondary mb-2">Base Model</div>
              <div className="font-bold text-xl drop-shadow-md" style={{ color: getSentColor(data.original_sentiment) }}>
                {data.original_sentiment}
              </div>
            </div>
            
            <div className="flex flex-col items-center">
              <ArrowRight size={24} className={data.is_sarcastic ? 'text-indigo-400' : 'text-textSecondary/30'} />
              {data.is_sarcastic && <span className="text-[10px] font-bold text-indigo-400 mt-1 uppercase tracking-widest animate-pulse">Recalibrated</span>}
            </div>

            <div className="text-center w-32">
              <div className="text-[10px] font-bold uppercase tracking-widest text-textSecondary mb-2">True Sentiment</div>
              <div className={`font-bold text-xl drop-shadow-md ${data.is_sarcastic ? 'scale-125' : ''} transition-all`} style={{ color: getSentColor(data.adjusted_sentiment) }}>
                {data.adjusted_sentiment}
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
