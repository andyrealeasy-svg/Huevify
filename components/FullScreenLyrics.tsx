import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../context/StoreContext.tsx';
import { 
  ArrowLeft, X, Play, Pause, SkipBack, SkipForward, 
  Volume, Volume1, Volume2, VolumeX, Mic2
} from './Icons.tsx';
import { ExplicitBadge } from './ExplicitBadge.tsx';
import { extractColorFromImage, getCachedColor, ExtractedColors, getHashPalette } from '../utils/colorExtractor.ts';
import { SupabaseService, isSupabaseConfigured } from '../services/supabase.ts';

const formatTime = (seconds: number) => {
  if (!seconds || isNaN(seconds)) return "0:00";
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min}:${sec.toString().padStart(2, '0')}`;
};

export const FullScreenLyrics: React.FC = () => {
  const { 
    currentTrack, setCurrentTrack, isPlaying, togglePlay, nextTrack, prevTrack, 
    progress, duration, seek, volume, setVolume,
    isFullScreenLyricsOpen, setFullScreenLyricsOpen, getTrackCover,
    goToArtist
  } = useStore();

  const cover = currentTrack ? getTrackCover(currentTrack) : '';
  const activeLineRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const isUserScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<number | null>(null);

  const [palette, setPalette] = useState<ExtractedColors>(() => {
    if (cover) {
      const cached = getCachedColor(cover);
      if (cached) return cached;
    }
    return currentTrack ? getHashPalette(currentTrack.id || currentTrack.title) : {
      primary: 'rgb(30, 30, 35)',
      dark: 'rgb(12, 12, 16)',
      gradient: 'linear-gradient(180deg, #18181f 0%, #0d0d12 60%, #08080a 100%)',
      glow: 'radial-gradient(circle at 50% 30%, rgba(40, 40, 50, 0.4) 0%, transparent 70%)',
      rgb: [24, 24, 31]
    };
  });

  useEffect(() => {
    if (!cover || !currentTrack) return;
    let isCancelled = false;

    const cached = getCachedColor(cover);
    if (cached) {
      setPalette(cached);
      return;
    }

    extractColorFromImage(cover, currentTrack.id || currentTrack.title || '').then(colors => {
      if (!isCancelled) {
        setPalette(colors);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [cover, currentTrack?.id]);

  // Fetch live lyrics from Supabase when opening lyrics screen if not already present
  useEffect(() => {
    if (!isFullScreenLyricsOpen || !currentTrack || !isSupabaseConfigured()) return;
    if (currentTrack.syncedLyrics && currentTrack.syncedLyrics.length > 0) return;
    
    let isCancelled = false;
    SupabaseService.fetchLyrics({
      hueq: currentTrack.hueq,
      trackId: currentTrack.id
    }).then(live => {
      if (!isCancelled && live && (live.lyrics || live.syncedLyrics)) {
        setCurrentTrack(prev => {
          if (!prev || (prev.id !== currentTrack.id && prev.hueq !== currentTrack.hueq)) return prev;
          return {
            ...prev,
            lyrics: live.lyrics || prev.lyrics,
            syncedLyrics: live.syncedLyrics || prev.syncedLyrics
          };
        });
      }
    }).catch(() => {});

    return () => {
      isCancelled = true;
    };
  }, [isFullScreenLyricsOpen, currentTrack?.id, currentTrack?.hueq]);

  // Determine current active lyric line based on current track progress
  const syncedLyrics = currentTrack?.syncedLyrics || [];
  const hasSyncedLyrics = syncedLyrics.length > 0;

  // Find index of the currently active line
  let activeIndex = -1;
  if (hasSyncedLyrics) {
    for (let i = 0; i < syncedLyrics.length; i++) {
      if (progress >= syncedLyrics[i].time) {
        activeIndex = i;
      } else {
        break;
      }
    }
  }

  // Handle auto-scrolling to active line when audio is playing
  useEffect(() => {
    if (!isFullScreenLyricsOpen || isUserScrollingRef.current) return;

    if (activeLineRef.current && scrollContainerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [activeIndex, isFullScreenLyricsOpen]);

  // Track when user manually scrolls to pause auto-scroll temporarily
  const handleScroll = () => {
    isUserScrollingRef.current = true;
    if (scrollTimeoutRef.current) {
      window.clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = window.setTimeout(() => {
      isUserScrollingRef.current = false;
    }, 3000);
  };

  if (!isFullScreenLyricsOpen || !currentTrack) return null;

  const rawPlainLyrics = currentTrack.lyrics || '';

  return (
    <div 
      id="fullscreen-lyrics-modal"
      className="fixed inset-0 z-[100] flex flex-col justify-between text-white animate-fade-in select-none overflow-hidden"
      style={{
        background: palette.gradient || 'linear-gradient(180deg, #18181f 0%, #0d0d12 100%)',
      }}
    >
      {/* Subtle Glow backdrop */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-40 transition-all duration-700"
        style={{ background: palette.glow }}
      />

      {/* TOP HEADER */}
      <header className="relative z-10 h-16 sm:h-20 px-4 sm:px-8 flex items-center justify-between border-b border-white/10 bg-black/30 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3.5 min-w-0">
          {/* Back button (Mobile arrow / PC close) */}
          <button
            type="button"
            onClick={() => setFullScreenLyricsOpen(false)}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/15 active:scale-95 transition flex items-center justify-center text-white border border-white/10 shadow-sm"
            title="Назад"
            aria-label="Назад"
          >
            <ArrowLeft size={20} className="md:hidden" />
            <X size={20} className="hidden md:block" />
          </button>

          {/* Track thumbnail + info */}
          <div className="flex items-center gap-3 min-w-0">
            {cover && (
              <img 
                src={cover} 
                alt={currentTrack.title}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover shadow border border-white/10 shrink-0" 
              />
            )}
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-bold text-sm sm:text-base text-white truncate">
                  {currentTrack.title}
                </span>
                {currentTrack.explicit && <ExplicitBadge size="sm" />}
              </div>
              <span 
                onClick={() => {
                  setFullScreenLyricsOpen(false);
                  goToArtist(currentTrack.artist);
                }}
                className="text-xs text-zinc-400 truncate hover:text-white hover:underline cursor-pointer"
              >
                {currentTrack.artist}
              </span>
            </div>
          </div>
        </div>

        {/* Right header label */}
        <div className="text-xs text-zinc-400 font-medium">
          Текст песни
        </div>
      </header>

      {/* LYRICS SCROLL AREA */}
      <main 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="relative z-10 flex-1 overflow-y-auto px-6 sm:px-16 md:px-28 py-12 sm:py-20 flex flex-col gap-6 sm:gap-10 scroll-smooth"
      >
        {hasSyncedLyrics ? (
          syncedLyrics.map((line, idx) => {
            const isCurrent = idx === activeIndex;
            const isPast = activeIndex !== -1 && idx < activeIndex;

            return (
              <div
                key={idx}
                ref={isCurrent ? activeLineRef : null}
                onClick={() => {
                  seek(line.time);
                }}
                className={`cursor-pointer transition-all duration-200 transform origin-left max-w-4xl ${
                  isCurrent
                    ? 'text-white text-2xl sm:text-4xl md:text-5xl font-extrabold scale-[1.01]'
                    : isPast
                      ? 'text-white/60 hover:text-white/90 text-xl sm:text-3xl md:text-4xl font-bold'
                      : 'text-white/25 hover:text-white/50 text-xl sm:text-3xl md:text-4xl font-semibold'
                }`}
              >
                <p className="leading-tight">{line.text}</p>
              </div>
            );
          })
        ) : rawPlainLyrics ? (
          <div className="max-w-3xl py-8 text-center sm:text-left">
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-6">
              Текст песни (без синхронизации)
            </div>
            {rawPlainLyrics.split('\n').map((line, idx) => (
              <p key={idx} className="text-xl sm:text-2xl font-bold text-white/90 leading-relaxed mb-2">
                {line || <span className="inline-block h-4" />}
              </p>
            ))}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-20 gap-3">
            <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center text-zinc-400">
              <Mic2 size={26} />
            </div>
            <h3 className="text-lg font-bold text-white">Текст трека пока не добавлен</h3>
            <p className="text-xs text-zinc-400 max-w-xs">
              Артист еще не загрузил слова для этой композиции.
            </p>
          </div>
        )}
      </main>

      {/* BOTTOM MINI PLAYER CONTROLS BAR */}
      <footer className="relative z-10 border-t border-white/10 bg-black/40 backdrop-blur-xl px-4 sm:px-8 py-3.5 sm:py-4 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Progress slider */}
        <div className="w-full flex items-center gap-3 text-xs text-zinc-400 font-mono">
          <span>{formatTime(progress)}</span>
          <div className="flex-1 h-1.5 bg-white/20 rounded-full relative group cursor-pointer overflow-hidden">
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={progress}
              onChange={(e) => seek(Number(e.target.value))}
              className="absolute w-full h-full opacity-0 cursor-pointer z-10"
              aria-label="Прогресс"
            />
            <div
              className="h-full bg-white rounded-full transition-[width] duration-75"
              style={{ width: `${(progress / (duration || 1)) * 100}%` }}
            />
          </div>
          <span>{formatTime(duration)}</span>
        </div>

        {/* Center player controls */}
        <div className="flex items-center gap-6">
          <button 
            onClick={prevTrack} 
            className="text-zinc-400 hover:text-white transition active:scale-95"
            title="Предыдущий трек"
          >
            <SkipBack size={22} fill="currentColor" />
          </button>

          <button 
            onClick={togglePlay} 
            className="w-10 h-10 bg-white hover:bg-zinc-200 text-black rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition shadow"
            title={isPlaying ? "Пауза" : "Воспроизведение"}
          >
            {isPlaying ? (
              <Pause size={20} fill="currentColor" />
            ) : (
              <Play size={20} fill="currentColor" className="ml-0.5" />
            )}
          </button>

          <button 
            onClick={nextTrack} 
            className="text-zinc-400 hover:text-white transition active:scale-95"
            title="Следующий трек"
          >
            <SkipForward size={22} fill="currentColor" />
          </button>
        </div>
      </footer>
    </div>
  );
};
