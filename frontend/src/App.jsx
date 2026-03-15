import { useState, useEffect, useRef } from 'react';
import Dashboard from './components/Dashboard';

// Animated floating dot particle
function Particle({ style }) {
  return (
    <div
      className="absolute rounded-full opacity-30 animate-float"
      style={style}
    />
  );
}

// Generates random particles scattered across the background
function ParticleField() {
  const particles = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    width: Math.random() * 4 + 2,
    top: Math.random() * 100,
    left: Math.random() * 100,
    delay: Math.random() * 4,
    duration: Math.random() * 4 + 4,
    color: i % 3 === 0 ? '#6d28d9' : i % 3 === 1 ? '#2563eb' : '#06b6d4',
  }));

  return (
    <div className="fixed inset-0 overflow-hidden -z-10 pointer-events-none">
      {particles.map((p) => (
        <Particle
          key={p.id}
          style={{
            width: p.width,
            height: p.width,
            top: `${p.top}%`,
            left: `${p.left}%`,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            boxShadow: `0 0 8px ${p.color}`,
          }}
        />
      ))}
    </div>
  );
}

function App() {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { setTimeout(() => setLoaded(true), 100); }, []);

  return (
    <div className="min-h-screen bg-background text-textPrimary selection:bg-primary/30 grid-bg">
      {/* Decorative blurred orbs */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-25%] left-[-15%] w-[55%] h-[55%] bg-primary/20 blur-[140px] rounded-full mix-blend-screen animate-float" />
        <div className="absolute bottom-[-25%] right-[-15%] w-[55%] h-[55%] bg-secondary/20 blur-[140px] rounded-full mix-blend-screen animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-[40%] right-[20%] w-[30%] h-[30%] bg-accent/10 blur-[120px] rounded-full mix-blend-screen animate-float" style={{ animationDelay: '1s' }} />
      </div>

      {/* Floating Particles */}
      <ParticleField />

      <main className={`container mx-auto px-4 py-10 transition-opacity duration-700 ${loaded ? 'opacity-100' : 'opacity-0'}`} style={{ maxWidth: '1400px' }}>
        <header className="mb-14 text-center animate-slide-up">
          {/* Spin ring behind badge */}
          <div className="relative inline-flex items-center justify-center mb-5">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary to-accent opacity-20 blur-lg animate-spin-slow" />
            <div className="relative inline-flex items-center gap-2 px-5 py-2 rounded-full border border-white/15 bg-white/5 backdrop-blur-md shimmer">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse inline-block" />
              <span className="text-xs font-semibold tracking-widest text-accent uppercase">Powered by Custom AI Models</span>
            </div>
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold mb-5 tracking-tight leading-none">
            Sentiment Analysis{' '}
            <span className="text-gradient animate-gradient bg-gradient-to-r from-primary via-secondary to-accent">
              Platform
            </span>
          </h1>
          <p className="text-textSecondary text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            Analyze customer feedback, brand reputation, and public opinion in{' '}
            <span className="text-white font-medium">real-time</span> using our
            ensemble of Classical ML and Deep Learning architectures.
          </p>

          {/* Stats bar */}
          <div className="flex flex-wrap items-center justify-center gap-4 mt-10">
            {[
              { label: 'ML Models', value: '5+' },
              { label: 'Accuracy', value: '91%' },
              { label: 'Sentiment Classes', value: '4' },
              { label: 'Languages', value: '10+' },
              { label: 'Data Sources', value: '5' },
            ].map((stat) => (
              <div key={stat.label} className="glass-panel px-5 py-3 rounded-2xl flex items-center gap-3 neon-border">
                <span className="text-2xl font-bold text-gradient">{stat.value}</span>
                <span className="text-textSecondary text-sm font-medium">{stat.label}</span>
              </div>
            ))}
          </div>
        </header>

        <Dashboard />
      </main>
    </div>
  );
}

export default App;

