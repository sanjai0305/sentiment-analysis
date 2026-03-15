import { useState, useRef } from 'react';
import { Loader2, AlertCircle, Mic, Square, Play, Activity, Sparkles } from 'lucide-react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const SENTIMENT_COLORS = {
  Positive: '#10b981',
  Negative: '#ef4444',
  Neutral: '#6b7280',
};

export default function VoiceTab() {
  const [recording, setRecording] = useState(false);
  const [audioURL, setAudioURL] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioURL(url);
        analyzeAudio(blob);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      audioChunksRef.current = [];
      mediaRecorderRef.current.start();
      setRecording(true);
      setError(''); setData(null); setAudioURL('');
    } catch (err) {
      setError('Microphone access denied or unavailable.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const analyzeAudio = async (audioBlob) => {
    setLoading(true); setError('');
    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.webm');
      
      const res = await axios.post(`${API_BASE}/voice`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Voice analysis failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel p-6 md:p-8 rounded-3xl animate-slide-up border-t-2 border-fuchsia-500">
      <div className="mb-8 text-center md:text-left">
        <h2 className="text-2xl font-bold mb-1 flex items-center justify-center md:justify-start gap-2 text-fuchsia-400">
          <Mic size={22} /> Voice-to-Sentiment Engine
        </h2>
        <p className="text-textSecondary text-sm">
          Speak your review. OpenAI Whisper transcribes it, and our ensemble AI analyzes the sentiment.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center py-10 border border-white/5 bg-surface/20 rounded-3xl mb-8 relative overflow-hidden">
        {/* Animated background when recording */}
        {recording && (
          <div className="absolute inset-0 bg-fuchsia-500/10 animate-pulse pointer-events-none" />
        )}

        <button
          onClick={recording ? stopRecording : startRecording}
          disabled={loading}
          className={`relative z-10 w-28 h-28 rounded-full flex items-center justify-center transition-all ${
            recording 
              ? 'bg-red-500 hover:bg-red-600 shadow-[0_0_40px_rgba(239,68,68,0.5)] scale-110' 
              : 'bg-fuchsia-600 hover:bg-fuchsia-500 shadow-[0_0_30px_rgba(192,38,211,0.3)] hover:scale-105'
          } disabled:animate-none disabled:opacity-50`}
        >
          {recording ? <Square size={32} className="text-white" fill="currentColor" /> : <Mic size={40} className="text-white" />}
        </button>

        <div className="mt-6 text-sm font-bold uppercase tracking-widest text-textSecondary relative z-10">
          {recording ? <span className="text-red-400 animate-pulse flex items-center gap-2">Recording... <Activity size={12}/></span> : 'Tap to Speak'}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-danger/10 border border-danger/20 rounded-xl text-danger flex items-center gap-2 text-sm animate-fade-in mb-6">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {loading && (
        <div className="text-center py-8 text-textSecondary animate-fade-in">
          <Loader2 size={36} className="animate-spin mx-auto mb-3 text-fuchsia-400 opacity-80" />
          <div className="text-sm font-semibold text-fuchsia-300">Whisper AI is transcribing...</div>
          <div className="text-[10px] text-textSecondary mt-1">First run downloads the Whisper model (~140MB).</div>
        </div>
      )}

      {audioURL && data && (
        <div className="animate-fade-in space-y-6">
          <div className="flex justify-center mb-6">
            <audio controls src={audioURL} className="h-10 w-full max-w-md sepia invert opacity-80" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="p-6 bg-surface/30 rounded-3xl border border-white/5 flex flex-col justify-center">
              <div className="text-[10px] font-bold uppercase tracking-widest text-fuchsia-400 mb-3 flex items-center gap-2">
                 <Activity size={14} /> Transcript
              </div>
              <p className="text-lg text-white font-medium leading-relaxed italic">
                "{data.transcript}"
              </p>
            </div>

            <div className="flex flex-col p-6 rounded-3xl border text-center justify-center items-center"
                 style={{ borderColor: `${SENTIMENT_COLORS[data.sentiment] || '#6b7280'}50`, backgroundColor: `${SENTIMENT_COLORS[data.sentiment] || '#6b7280'}15` }}>
               <div className="text-[10px] font-bold uppercase tracking-widest text-textSecondary mb-2">Vocal Sentiment</div>
               <div className="text-5xl font-extrabold drop-shadow-lg" style={{ color: SENTIMENT_COLORS[data.sentiment] || '#6b7280' }}>
                  {data.sentiment}
               </div>
               <div className="mt-3 text-xs text-textSecondary font-mono uppercase">
                  Language: {data.language}
               </div>
            </div>

          </div>
        </div>
      )}
      
      {!data && !loading && !recording && !audioURL && (
        <div className="text-center p-6 bg-surface/20 rounded-2xl border border-white/5 text-sm text-textSecondary">
          <p>Provide customer feedback using your voice. Whisper runs entirely locally on your machine for absolute privacy.</p>
        </div>
      )}
    </div>
  );
}
