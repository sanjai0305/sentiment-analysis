import { useState, useEffect, useRef } from 'react';
import { Loader2, AlertCircle, TrendingUp, Cpu, Hash, Activity } from 'lucide-react';
import axios from 'axios';

const API_BASE = "http://localhost:8000";

export default function TopicTab() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const fetchTopics = async () => {
    setLoading(true); setError('');
    try {
      const res = await axios.get(`${API_BASE}/topics`);
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to generate topics (Not enough data yet?).');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopics();
  }, []);

  return (
    <div className="glass-panel p-6 md:p-8 rounded-3xl animate-slide-up border-t-2 border-pink-500">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold mb-1 flex items-center gap-2 text-pink-400">
            <Hash size={22} /> AI Topic Modeling & Trends
          </h2>
          <p className="text-textSecondary text-sm">
            Uses LDA / BERTopic to automatically cluster what people are talking about across all analyzed data.
          </p>
        </div>
        <button
          onClick={fetchTopics}
          disabled={loading}
          className="p-2 bg-surface/30 border border-white/10 rounded-xl hover:bg-white/5 transition-all disabled:opacity-50"
          title="Refresh Topics"
        >
          <Activity size={18} className={`text-pink-400 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="p-4 bg-danger/10 border border-danger/20 rounded-xl text-danger flex items-center gap-2 text-sm mb-6">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {!data && loading && (
        <div className="text-center py-20 text-textSecondary animate-pulse flex flex-col items-center">
          <Cpu size={40} className="text-pink-400/50 mb-4" />
          Clustering entire history database...
        </div>
      )}

      {data && data.topics && data.topics.length === 0 && (
        <div className="text-center py-16 text-textSecondary bg-surface/20 rounded-2xl border border-white/5">
          Not enough text data recorded yet to form meaningful topics. Analyze some YouTube or Reddit posts first!
        </div>
      )}

      {data && data.topics && data.topics.length > 0 && (
        <div className="space-y-4 animate-fade-in">
          {data.topics.map((topic, i) => (
            <div key={i} className="bg-surface/30 p-5 rounded-2xl border border-white/5 hover:border-pink-500/30 transition-all flex flex-col md:flex-row gap-4 items-center">
              
              <div className="flex-shrink-0 w-16 h-16 rounded-full border-4 border-pink-500/20 flex items-center justify-center relative">
                <div className="text-sm font-bold text-pink-400">{topic.percentage}%</div>
              </div>

              <div className="flex-1 text-center md:text-left">
                <div className="text-xs font-bold uppercase tracking-widest text-textSecondary mb-1">Cluster {topic.id + 1}</div>
                <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                  {topic.keywords.map((kw, j) => (
                    <span key={j} className="text-sm px-3 py-1 bg-pink-500/10 text-pink-300 rounded-full border border-pink-500/20 shadow-sm">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex-shrink-0 text-center px-4 py-2 border-l border-white/5">
                <div className="text-3xl font-black text-white">{topic.doc_count}</div>
                <div className="text-[10px] uppercase text-textSecondary tracking-widest">Mentions</div>
              </div>

            </div>
          ))}

          <div className="mt-6 p-4 bg-surface/20 rounded-xl border border-white/5 text-xs text-textSecondary text-center italic">
            * Topics are dynamically generated based on the last 200 items in your analysis history across all sources.
          </div>
        </div>
      )}
    </div>
  );
}
