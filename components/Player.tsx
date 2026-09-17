import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../context/StoreContext.tsx';
import { Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, Volume, Volume1, Volume2, VolumeX, Heart, Plus, ListMusic, MoreHorizontal } from './Icons.tsx';
import { PlayMode } from '../types.ts';
import { extractColorFromImage } from '../utils/colorExtractor.ts';
import { ExplicitBadge } from './ExplicitBadge.tsx';
import { TrackMenuModal } from './TrackMenuModal.tsx';

const formatTime = (seconds: number) => {
  if (!seconds) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const Player = () => {
  const { 
    currentTrack, isPlaying, togglePlay, nextTrack, prevTrack, 
    progress, duration, seek, volume, setVolume, playMode, toggleRepeat,
    isLiked, toggleLike, setMobilePlayerOpen, isShuffle, toggleShuffle,
    openAddToPlaylist, goToArtist, getTrackCover, t, appSettings, tracks, playTrack
  } = useStore();

  const isLiquidGlass = appSettings?.liquidGlassNav !== false;
  const cover = currentTrack ? getTrackCover(currentTrack) : '';
  const prevVolumeRef = useRef(volume > 0 ? volume : 1);
  const [isTrackMenuOpen, setIsTrackMenuOpen] = useState(false);

  const toggleMute = () => {
    if (volume > 0) {
      prevVolumeRef.current = volume;
      setVolume(0);
    } else {
      setVolume(prevVolumeRef.current || 1);
    }
  };

  useEffect(() => {
    if (cover && currentTrack) {
      extractColorFromImage(cover, currentTrack.id || currentTrack.title || '');
    }
  }, [cover, currentTrack?.id]);

  // Idle state: On desktop, render a clean idle player bar so space is properly defined and no gap/cut-off exists
  if (!currentTrack) {
    return (
      <div 
        id="mini-player-idle-bar"
        className="hidden md:flex relative w-full h-20 md:h-[84px] shrink-0 bg-surface border-t border-surface-highlight px-4 items-center justify-between z-40 select-none"
      >
        {/* Left Side: Idle info */}
        <div className="flex items-center w-1/4 min-w-[180px] overflow-hidden">
          <div className="w-12 h-12 rounded bg-surface-highlight/70 border border-white/5 flex items-center justify-center shrink-0 mr-3 text-secondary">
            <ListMusic size={22} />
          </div>
          <div className="flex flex-col overflow-hidden min-w-0">
            <span className="text-xs font-bold text-white/90 truncate">Huevify</span>
            <span className="text-[11px] text-secondary truncate mt-0.5">
              {t('selectTrackToPlay', 'Выберите трек для прослушивания')}
            </span>
          </div>
        </div>

        {/* Controls Center */}
        <div className="flex flex-col items-center w-2/4 max-w-2xl">
          <div className="flex items-center gap-6 mb-2">
            <button disabled className="text-secondary/40 cursor-not-allowed" title={t('shuffle')}>
              <Shuffle size={18} />
            </button>
            <button disabled className="text-secondary/40 cursor-not-allowed" title={t('prevTrack')}>
              <SkipBack size={22} fill="currentColor" />
            </button>
            <button 
              onClick={() => {
                const playable = tracks.filter(t => !t.isUnreleased && Boolean(t.url));
                if (playable.length > 0) {
                  playTrack(playable[0], playable);
                }
              }}
              className="w-8 h-8 bg-white/90 hover:bg-white rounded-full flex items-center justify-center hover:scale-105 transition text-black shadow-md"
              title={t('play')}
            >
              <Play size={18} fill="currentColor" className="ml-0.5" />
            </button>
            <button disabled className="text-secondary/40 cursor-not-allowed" title={t('nextTrack')}>
              <SkipForward size={22} fill="currentColor" />
            </button>
            <button disabled className="text-secondary/40 cursor-not-allowed" title={t('repeat')}>
              <Repeat size={18} />
            </button>
          </div>

          <div className="flex items-center w-full gap-2 text-xs text-secondary/40">
            <span>0:00</span>
            <div className="flex-1 h-1 bg-surface-highlight/50 rounded-full" />
            <span>0:00</span>
          </div>
        </div>

        {/* Volume Right */}
        <div className="flex items-center justify-end w-1/4 min-w-[150px] gap-2">
          <button 
            type="button"
            onClick={toggleMute}
            className="text-secondary hover:text-white transition focus:outline-none p-1 rounded hover:bg-white/5"
            title={volume === 0 ? "Включить звук" : `Выключить звук (${Math.round(volume * 100)}%)`}
            aria-label="Громкость"
          >
            {volume === 0 ? (
              <VolumeX size={18} />
            ) : volume < 0.5 ? (
              <Volume1 size={18} />
            ) : (
              <Volume2 size={18} />
            )}
          </button>
          <div 
            className="w-24 h-1 bg-surface-highlight rounded-full relative group cursor-pointer"
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
                className="h-full bg-white rounded-full group-hover:bg-primary transition-colors"
                style={{ width: `${volume * 100}%` }}
              />
          </div>
        </div>
      </div>
    );
  }

  const allArtists = Array.from(new Set([currentTrack.artist, ...(currentTrack.mainArtists || [])]));

  return (
    // On mobile: floating liquid glass card. On desktop: docked bottom bar.
    <div 
      id="mini-player-bar"
      className={`max-md:fixed ${
        isLiquidGlass 
          ? 'max-md:bottom-[calc(env(safe-area-inset-bottom)+76px)] max-md:rounded-2xl max-md:bg-zinc-900/70 max-md:backdrop-blur-2xl max-md:border max-md:border-white/15 max-md:shadow-[0_12px_32px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.25)]' 
          : 'max-md:bottom-[68px] max-md:rounded-lg max-md:bg-[#212124]/95 max-md:backdrop-blur-xl max-md:border max-md:border-white/10 max-md:shadow-[0_8px_24px_rgba(0,0,0,0.85)]'
      } max-md:left-2 max-md:right-2 max-md:h-14 max-md:z-50 md:relative md:w-full md:h-20 md:h-[84px] md:shrink-0 md:bg-surface md:border-t md:border-surface-highlight md:z-40 px-2.5 md:px-4 flex items-center justify-between transition-all select-none overflow-hidden`}
    >
      
      {/* Track Info - Clickable on mobile to open full player */}
      <div 
        className="flex items-center flex-1 min-w-0 mr-2 md:mr-0 md:w-1/4 md:min-w-[180px] overflow-hidden cursor-pointer md:cursor-default"
        onClick={() => {
            if (window.innerWidth < 768) {
                setMobilePlayerOpen(true);
            }
        }}
      >
        <img 
          src={cover} 
          alt="Cover" 
          className="h-10 w-10 md:h-14 md:w-14 rounded md:rounded-md shadow-md mr-2.5 md:mr-4 flex-shrink-0 object-cover" 
        />
        <div className="flex flex-col overflow-hidden min-w-0 mr-2 md:mr-4 flex-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-xs md:text-sm font-semibold text-white truncate hover:underline cursor-pointer leading-tight">
              {currentTrack.title}
            </span>
            {currentTrack.explicit && <ExplicitBadge />}
          </div>
          <div className="text-[11px] md:text-xs text-white/70 md:text-secondary truncate mt-0.5 leading-tight">
              {allArtists.map((a, i) => (
                  <span key={a}>
                      {i > 0 && ", "}
                      <span 
                        onClick={(e) => { e.stopPropagation(); goToArtist(a); }} 
                        className="hover:text-white hover:underline cursor-pointer"
                      >
                          {a}
                      </span>
                  </span>
              ))}
          </div>
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); toggleLike(currentTrack.id); }} 
          className={`hidden md:block hover:scale-105 transition mr-2 ${isLiked(currentTrack.id) ? 'text-primary' : 'text-secondary hover:text-white'}`}
          title={isLiked(currentTrack.id) ? "В любимых" : "Добавить в любимые"}
        >
          <Heart size={20} fill={isLiked(currentTrack.id) ? 'currentColor' : 'none'} />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); openAddToPlaylist(currentTrack.id); }} 
          className="hidden md:block hover:scale-105 transition text-secondary hover:text-white"
          title="Добавить в плейлист"
        >
          <Plus size={20} />
        </button>
      </div>

      {/* Mobile Controls Right Side */}
      <div className="flex items-center gap-1.5 md:hidden shrink-0">
        <button 
          onClick={(e) => { e.stopPropagation(); toggleLike(currentTrack.id); }} 
          className={`p-2 transition active:scale-90 ${isLiked(currentTrack.id) ? 'text-primary' : 'text-white/70 hover:text-white'}`}
          title={isLiked(currentTrack.id) ? "В любимых" : "Добавить в любимые"}
        >
          <Heart size={20} fill={isLiked(currentTrack.id) ? 'currentColor' : 'none'} />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); togglePlay(); }} 
          className="p-2 text-white hover:text-white/90 active:scale-90 transition flex items-center justify-center"
          title={isPlaying ? "Пауза" : "Воспроизведение"}
        >
          {isPlaying ? (
            <Pause size={22} fill="currentColor" />
          ) : (
            <Play size={22} fill="currentColor" className="ml-0.5" />
          )}
        </button>
      </div>

      {/* Controls (Desktop Centered) */}
      <div className="hidden md:flex flex-col items-center w-auto md:w-2/4 max-w-2xl">
        <div className="flex items-center gap-4 md:gap-6 mb-0 md:mb-2">
          <button 
             onClick={toggleShuffle}
             className={`transition ${isShuffle ? 'text-primary' : 'text-secondary hover:text-white'}`}
             title="Перемешать"
          >
            <Shuffle size={20} />
          </button>
          <button onClick={prevTrack} className="text-secondary hover:text-white transition" title="Предыдущий трек">
            <SkipBack size={24} fill="currentColor" />
          </button>
          
          <button 
            onClick={(e) => { e.stopPropagation(); togglePlay(); }} 
            className="w-8 h-8 bg-white rounded-full flex items-center justify-center hover:scale-105 transition text-black shadow-md"
            title={isPlaying ? "Пауза" : "Воспроизведение"}
          >
            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
          </button>

          <button onClick={nextTrack} className="text-secondary hover:text-white transition" title="Следующий трек">
            <SkipForward size={24} fill="currentColor" />
          </button>
          <button 
            onClick={toggleRepeat} 
            className={`transition relative ${playMode !== PlayMode.OFF ? 'text-primary' : 'text-secondary hover:text-white'}`}
            title="Повтор"
          >
            <Repeat size={20} />
            {playMode === PlayMode.ONE && <span className="absolute text-[8px] font-bold top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary">1</span>}
            {playMode === PlayMode.CONTEXT && <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full"></div>}
          </button>
        </div>

        {/* Progress Bar (Desktop) */}
        <div className="flex items-center w-full gap-2 text-xs text-secondary">
          <span>{formatTime(progress)}</span>
          <div className="flex-1 h-1 bg-surface-highlight rounded-full relative group">
             <input
                type="range"
                min={0}
                max={duration || 100}
                value={progress}
                onChange={(e) => seek(Number(e.target.value))}
                className="absolute w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div 
                className="h-full bg-white rounded-full group-hover:bg-primary transition-colors"
                style={{ width: `${(progress / (duration || 1)) * 100}%` }}
              />
          </div>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Volume & More (Desktop) */}
      <div className="hidden md:flex items-center justify-end w-1/4 min-w-[150px] gap-2">
        <button 
          type="button"
          onClick={toggleMute}
          className="text-secondary hover:text-white transition focus:outline-none p-1 rounded hover:bg-white/5"
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
          className="w-24 h-1 bg-surface-highlight rounded-full relative group cursor-pointer mr-2"
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
              className="h-full bg-white rounded-full group-hover:bg-primary transition-colors"
              style={{ width: `${volume * 100}%` }}
            />
        </div>

        {/* Three Dots Button for Current Track on Desktop */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsTrackMenuOpen(true);
          }}
          className="text-secondary hover:text-white transition p-1.5 rounded-full hover:bg-white/10 active:scale-95"
          title={t('more', 'Ещё')}
          aria-label="Параметры трека"
        >
          <MoreHorizontal size={20} />
        </button>
      </div>

      {/* Floating Mini Player Progress Bar (Bottom outline on mobile) */}
      <div className="absolute bottom-0 left-0 right-0 w-full h-[2.5px] bg-white/15 md:hidden pointer-events-none rounded-b-lg overflow-hidden">
        <div 
          className="h-full bg-white transition-[width] duration-150 ease-linear" 
          style={{ width: `${(progress / (duration || 1)) * 100}%` }} 
        />
      </div>

      {/* Track Action Bottom Sheet Modal */}
      <TrackMenuModal
        track={currentTrack}
        isOpen={isTrackMenuOpen}
        onClose={() => setIsTrackMenuOpen(false)}
      />
    </div>
  );
};