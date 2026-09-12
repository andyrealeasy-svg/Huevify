import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { 
  ChevronDown, Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, 
  Heart, Plus, ListMusic, Volume, Volume1, Volume2, VolumeX
} from './Icons';
import { PlayMode } from '../types';
import { extractColorFromImage, getCachedColor, getHashPalette, ExtractedColors } from '../utils/colorExtractor';

const formatTime = (seconds: number) => {
    if (!seconds) return "0:00";
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
};

export const FullScreenPlayer = () => {
  const { 
    isMobilePlayerOpen, setMobilePlayerOpen, currentTrack, isPlaying, 
    togglePlay, nextTrack, prevTrack, progress, duration, seek,
    playMode, toggleRepeat, isLiked, toggleLike, openAddToPlaylist,
    isShuffle, toggleShuffle, volume, setVolume, goToArtist, getTrackCover
  } = useStore();

  const cover = currentTrack ? getTrackCover(currentTrack) : '';
  const prevVolumeRef = React.useRef(volume > 0 ? volume : 1);

  const toggleMute = () => {
    if (volume > 0) {
      prevVolumeRef.current = volume;
      setVolume(0);
    } else {
      setVolume(prevVolumeRef.current || 1);
    }
  };

  const [palette, setPalette] = useState<ExtractedColors>(() => {
    if (cover) {
      const cached = getCachedColor(cover);
      if (cached) return cached;
    }
    return currentTrack ? getHashPalette(currentTrack.id || currentTrack.title) : {
      primary: 'rgb(55, 65, 81)',
      dark: 'rgb(15, 18, 25)',
      gradient: 'linear-gradient(180deg, #2b3040 0%, #171b24 45%, #0f1117 75%, #08090c 100%)',
      glow: 'radial-gradient(circle at 50% 32%, rgba(65, 75, 95, 0.45) 0%, transparent 68%)',
      rgb: [43, 48, 64]
    };
  });

  useEffect(() => {
    if (!cover) return;
    let isCancelled = false;

    const cached = getCachedColor(cover);
    if (cached) {
      setPalette(cached);
      return;
    }

    extractColorFromImage(cover, currentTrack?.id || currentTrack?.title || '').then(colors => {
      if (!isCancelled) {
        setPalette(colors);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [cover, currentTrack?.id]);

  if (!currentTrack) return null;

  const allArtists = Array.from(new Set([currentTrack.artist, ...(currentTrack.mainArtists || [])]));

  return (
    <div 
        id="fullscreen-player"
        className={`fixed inset-0 z-[60] flex flex-col p-6 transition-transform duration-300 ease-in-out md:hidden overflow-hidden ${isMobilePlayerOpen ? 'translate-y-0' : 'translate-y-[100%]'}`}
        style={{
          background: palette.gradient,
          transition: 'background 0.6s cubic-bezier(0.2, 0.8, 0.2, 1), transform 0.3s ease-in-out'
        }}
    >
      {/* Ambient Radial Glow matching the cover art */}
      <div 
        className="absolute inset-0 pointer-events-none transition-all duration-700 opacity-60"
        style={{
          background: palette.glow
        }}
      />

      <div className="relative z-10 flex flex-col h-full justify-between">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <button onClick={() => setMobilePlayerOpen(false)} className="text-white hover:opacity-80 transition" aria-label="Close player">
            <ChevronDown size={32} />
          </button>
          <span className="text-xs font-bold tracking-widest uppercase text-white/90">Now Playing</span>
          <button className="text-white hover:opacity-80 transition" onClick={() => openAddToPlaylist(currentTrack.id)} aria-label="Add to playlist">
            <Plus size={24} />
          </button>
        </div>

        {/* Cover Art */}
        <div className="flex-1 flex items-center justify-center my-auto min-h-0 py-2">
          <div 
            className="w-full max-w-[340px] aspect-square rounded-xl overflow-hidden transition-all duration-500"
            style={{
              boxShadow: `0 24px 48px -12px rgba(0,0,0,0.75), 0 8px 30px -8px ${palette.primary}`
            }}
          >
            <img 
              src={cover} 
              alt={currentTrack.title} 
              crossOrigin="anonymous"
              className="w-full h-full object-cover" 
              onLoad={() => {
                if (!getCachedColor(cover)) {
                  extractColorFromImage(cover, currentTrack?.id || currentTrack?.title || '').then(setPalette);
                }
              }}
            />
          </div>
        </div>

        {/* Track Info */}
        <div className="flex justify-between items-center mt-4 mb-4">
          <div className="flex flex-col overflow-hidden mr-4">
            <h2 className="text-2xl font-bold text-white truncate marquee">{currentTrack.title}</h2>
            <div className="text-lg text-white/80 truncate">
                {allArtists.map((a, i) => (
                    <span key={a}>
                        {i > 0 && ", "}
                        <span 
                          onClick={() => { setMobilePlayerOpen(false); goToArtist(a); }} 
                          className="underline decoration-transparent hover:decoration-white/60 cursor-pointer transition"
                        >
                            {a}
                        </span>
                    </span>
                ))}
            </div>
          </div>
          <button 
              onClick={() => toggleLike(currentTrack.id)}
              className={`${isLiked(currentTrack.id) ? 'text-primary' : 'text-white'} hover:scale-105 transition`}
              aria-label="Like track"
          >
              <Heart size={32} fill={isLiked(currentTrack.id) ? 'currentColor' : 'none'} />
          </button>
        </div>

        {/* Progress */}
        <div className="mb-4">
          <div className="w-full h-1 bg-white/20 rounded-full mb-2 relative group">
             <input
                type="range"
                min={0}
                max={duration || 100}
                value={progress}
                onChange={(e) => seek(Number(e.target.value))}
                className="absolute w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div 
                className="h-full bg-white rounded-full"
                style={{ width: `${(progress / (duration || 1)) * 100}%` }}
              />
              <div 
                  className="absolute h-3 w-3 bg-white rounded-full top-1/2 -translate-y-1/2 shadow-md"
                  style={{ left: `${(progress / (duration || 1)) * 100}%` }}
              />
          </div>
          <div className="flex justify-between text-xs text-white/70 font-medium">
            <span>{formatTime(progress)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-between items-center mb-6">
          <button 
              onClick={toggleShuffle}
              className={`${isShuffle ? 'text-primary' : 'text-white/70 hover:text-white'} transition`}
              aria-label="Shuffle"
          >
            <Shuffle size={24} />
          </button>
          
          <button onClick={prevTrack} className="text-white hover:scale-110 active:scale-95 transition" aria-label="Previous track">
            <SkipBack size={36} fill="currentColor" />
          </button>
          
          <button 
            onClick={togglePlay} 
            className="w-16 h-16 bg-white rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition text-black shadow-lg"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
          </button>

          <button onClick={nextTrack} className="text-white hover:scale-110 active:scale-95 transition" aria-label="Next track">
            <SkipForward size={36} fill="currentColor" />
          </button>
          
          <button 
              onClick={toggleRepeat} 
              className={`${playMode !== PlayMode.OFF ? 'text-primary' : 'text-white/70 hover:text-white'} transition relative`}
              aria-label="Repeat mode"
          >
            <Repeat size={24} />
            {playMode === PlayMode.ONE && <span className="absolute text-[8px] font-bold top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary">1</span>}
            {playMode === PlayMode.CONTEXT && <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full"></div>}
          </button>
        </div>

        {/* Mobile Volume Control */}
        <div className="flex items-center gap-3 pb-1">
           <button 
             type="button"
             onClick={toggleMute}
             className="text-white/70 hover:text-white transition focus:outline-none p-1 rounded"
             title={volume === 0 ? "Включить звук" : `Выключить звук (${Math.round(volume * 100)}%)`}
             aria-label="Громкость"
           >
             {volume === 0 ? (
               <VolumeX size={20} />
             ) : volume < 0.5 ? (
               <Volume1 size={20} />
             ) : (
               <Volume2 size={20} />
             )}
           </button>
           <div 
             className="flex-1 h-1 bg-white/20 rounded-full relative group cursor-pointer"
             title={`Громкость: ${Math.round(volume * 100)}%`}
           >
              <input 
                type="range" 
                min={0} 
                max={1} 
                step={0.01} 
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                aria-label="Регулятор громкости"
                className="absolute w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div 
                className="h-full bg-white rounded-full"
                style={{ width: `${volume * 100}%` }}
              />
           </div>
        </div>
      </div>

    </div>
  );
};