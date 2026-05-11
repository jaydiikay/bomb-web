import React, { useEffect } from 'react';

const NUM_PARTICLES = 24;

function makeParticles() {
  const particles = [];
  for (let i = 0; i < NUM_PARTICLES; i++) {
    const angle = (360 / NUM_PARTICLES) * i;
    const distance = 120 + Math.random() * 180;
    const size = 8 + Math.random() * 18;
    const hue = Math.floor(Math.random() * 60); // reds/oranges
    const delay = Math.random() * 0.4;
    const duration = 0.8 + Math.random() * 0.8;
    particles.push({ angle, distance, size, hue, delay, duration, i });
  }
  return particles;
}

const PARTICLES = makeParticles();

export default function BombAnimation({ onComplete }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete && onComplete();
    }, 2600);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="bomb-overlay">
      <div className="bomb-shake-container">
        {/* Expanding ring */}
        <div className="bomb-ring bomb-ring-1" />
        <div className="bomb-ring bomb-ring-2" />
        <div className="bomb-ring bomb-ring-3" />

        {/* Particles */}
        {PARTICLES.map((p) => {
          const rad = (p.angle * Math.PI) / 180;
          const tx = Math.cos(rad) * p.distance;
          const ty = Math.sin(rad) * p.distance;
          return (
            <div
              key={p.i}
              className="bomb-particle"
              style={{
                width: p.size,
                height: p.size,
                background: `hsl(${p.hue}, 100%, 55%)`,
                animationDelay: `${p.delay}s`,
                animationDuration: `${p.duration}s`,
                '--tx': `${tx}px`,
                '--ty': `${ty}px`,
              }}
            />
          );
        })}

        {/* Central flash */}
        <div className="bomb-flash" />

        {/* Text */}
        <div className="bomb-text">
          <div className="bomb-emoji">💣</div>
          <div className="bomb-label">BOMB!</div>
          <div className="bomb-sublabel">7 of Hearts!</div>
        </div>
      </div>
    </div>
  );
}
