'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="min-h-screen bg-night flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Atmospheric background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-village-gold/5 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-wolf-red/5 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1.5s' }} />
      </div>

      {/* Logo */}
      <div className={`text-center mb-16 relative z-10 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <div className="mb-6 text-7xl animate-float">🎭</div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-widest text-village-gold mb-3 animate-glow">
          GAME MASTER
        </h1>
        <p className="text-lg text-gray-500 tracking-[0.4em] uppercase">Inteligencia Artificial</p>
        <div className="mt-4 h-px w-48 mx-auto bg-gradient-to-r from-transparent via-village-gold/50 to-transparent" />
      </div>

      {/* Navigation */}
      <div className={`flex flex-col gap-5 w-full max-w-sm relative z-10 transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <Link
          href="/game-master"
          className="group flex items-center gap-5 bg-night-card border border-village-gold/20 rounded-2xl px-8 py-6 hover:border-village-gold/60 hover:bg-night-border transition-all duration-300 hover:shadow-lg hover:shadow-village-gold/10"
        >
          <span className="text-4xl group-hover:scale-110 transition-transform duration-300">🎮</span>
          <div>
            <div className="text-xl font-semibold text-white">Pantalla del Game Master</div>
            <div className="text-sm text-gray-500 mt-0.5">Control central de la partida</div>
          </div>
        </Link>

        <Link
          href="/player"
          className="group flex items-center gap-5 bg-night-card border border-white/10 rounded-2xl px-8 py-6 hover:border-white/25 hover:bg-night-border transition-all duration-300"
        >
          <span className="text-4xl group-hover:scale-110 transition-transform duration-300">👤</span>
          <div>
            <div className="text-xl font-semibold text-white">Soy Jugador</div>
            <div className="text-sm text-gray-500 mt-0.5">Únete con un código de partida</div>
          </div>
        </Link>
      </div>

      <p className={`mt-12 text-xs text-gray-700 tracking-widest relative z-10 transition-all duration-1000 delay-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
        GAME MASTER AI · v1.0 · Hombre Lobo
      </p>
    </div>
  );
}
